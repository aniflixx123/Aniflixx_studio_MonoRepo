// websocket.service.js - Complete Production Implementation
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ObjectId } = require('mongodb');
const { users, reels, comments, notifications } = require('../utils/db');
const { createNotification } = require('../controllers/notifications.controller');
const redis = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

// JWT verification setup
const client = jwksClient({
  jwksUri: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

// Connection state tracking
class ConnectionTracker {
  constructor() {
    this.connections = new Map(); // socketId -> connection info
    this.userConnections = new Map(); // userId -> Set of socketIds
    this.connectionHealth = new Map(); // socketId -> health metrics
    this.ipConnections = new Map(); // IP -> count
  }

  addConnection(socketId, userId, metadata = {}) {
    const connectionInfo = {
      socketId,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      platform: metadata.platform || 'unknown',
      appState: metadata.appState || 'active',
      version: metadata.version || '1.0.0',
      ip: metadata.ip,
      ...metadata
    };
    
    this.connections.set(socketId, connectionInfo);
    
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(socketId);
    
    this.connectionHealth.set(socketId, {
      lastPing: Date.now(),
      lastPong: Date.now(),
      latency: 0,
      missedPings: 0,
      avgLatency: 0,
      latencyHistory: []
    });
    
    // Track IP connections
    if (metadata.ip) {
      const count = this.ipConnections.get(metadata.ip) || 0;
      this.ipConnections.set(metadata.ip, count + 1);
    }
  }

  removeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const userSockets = this.userConnections.get(connection.userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
      
      // Update IP connections
      if (connection.ip) {
        const count = this.ipConnections.get(connection.ip) || 1;
        if (count <= 1) {
          this.ipConnections.delete(connection.ip);
        } else {
          this.ipConnections.set(connection.ip, count - 1);
        }
      }
      
      this.connections.delete(socketId);
      this.connectionHealth.delete(socketId);
    }
  }

  updateActivity(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  updateAppState(socketId, appState) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.appState = appState;
    }
  }

  getConnectionsByUser(userId) {
    const socketIds = this.userConnections.get(userId);
    if (!socketIds) return [];
    
    return Array.from(socketIds).map(socketId => 
      this.connections.get(socketId)
    ).filter(Boolean);
  }

  isUserOnline(userId) {
    return this.userConnections.has(userId) && 
           this.userConnections.get(userId).size > 0;
  }

  getActiveConnections() {
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    
    return Array.from(this.connections.values()).filter(conn => {
      const lastActivity = new Date(conn.lastActivity).getTime();
      return now - lastActivity < activeThreshold;
    });
  }

  recordPing(socketId) {
    const health = this.connectionHealth.get(socketId);
    if (health) {
      health.lastPing = Date.now();
    }
  }

  recordPong(socketId) {
    const health = this.connectionHealth.get(socketId);
    if (health) {
      health.lastPong = Date.now();
      const latency = health.lastPong - health.lastPing;
      health.latency = latency;
      health.missedPings = 0;
      
      // Update latency history
      health.latencyHistory.push(latency);
      if (health.latencyHistory.length > 10) {
        health.latencyHistory.shift();
      }
      
      // Calculate average latency
      const sum = health.latencyHistory.reduce((a, b) => a + b, 0);
      health.avgLatency = Math.round(sum / health.latencyHistory.length);
    }
  }

  recordMissedPing(socketId) {
    const health = this.connectionHealth.get(socketId);
    if (health) {
      health.missedPings++;
    }
  }

  getConnectionHealth(socketId) {
    return this.connectionHealth.get(socketId);
  }

  getIPConnectionCount(ip) {
    return this.ipConnections.get(ip) || 0;
  }

  cleanupStaleConnections(io, maxInactivity = 10 * 60 * 1000) {
    const now = Date.now();
    const staleConnections = [];
    
    for (const [socketId, connection] of this.connections.entries()) {
      const lastActivity = new Date(connection.lastActivity).getTime();
      const health = this.connectionHealth.get(socketId);
      
      // Check for stale connections
      if (now - lastActivity > maxInactivity || 
          (health && health.missedPings > 3)) {
        staleConnections.push(socketId);
      }
    }
    
    // Disconnect stale connections
    staleConnections.forEach(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        console.log(`🧹 Cleaning up stale connection: ${socketId}`);
        socket.disconnect(true);
      }
      this.removeConnection(socketId);
    });
    
    return staleConnections.length;
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userConnections.size,
      uniqueIPs: this.ipConnections.size,
      activeConnections: this.getActiveConnections().length,
      platformBreakdown: this.getPlatformBreakdown(),
      avgLatency: this.getAverageLatency()
    };
  }

  getPlatformBreakdown() {
    const breakdown = {};
    for (const conn of this.connections.values()) {
      breakdown[conn.platform] = (breakdown[conn.platform] || 0) + 1;
    }
    return breakdown;
  }

  getAverageLatency() {
    let totalLatency = 0;
    let count = 0;
    
    for (const health of this.connectionHealth.values()) {
      if (health.avgLatency > 0) {
        totalLatency += health.avgLatency;
        count++;
      }
    }
    
    return count > 0 ? Math.round(totalLatency / count) : 0;
  }
}

// Rate limiter
class RateLimiter {
  constructor() {
    this.limits = new Map();
    this.windowMs = 60000; // 1 minute
    this.maxRequests = 100;
  }

  check(identifier, maxRequests = this.maxRequests) {
    const now = Date.now();
    const userLimit = this.limits.get(identifier);
    
    if (!userLimit) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + this.windowMs;
      return true;
    }
    
    if (userLimit.count >= maxRequests) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(identifier);
      }
    }
  }
}

// Main WebSocket Service
class WebSocketService {
  constructor() {
    this.io = null;
    this.connectionTracker = new ConnectionTracker();
    this.rateLimiter = new RateLimiter();
    this.activeViewers = new Map(); // reelId -> Set of userIds
    this.typingUsers = new Map(); // reelId -> Set of userIds
    this.roomSubscriptions = new Map(); // socketId -> Set of rooms
    this.cleanupInterval = null;
    this.healthCheckInterval = null;
    this.rateLimiterCleanupInterval = null;
    this.pubClient = null;
    this.subClient = null;
  }

  async initialize(server) {
    console.log('🚀 Initializing Production WebSocket Service...');
    
    // Initialize Redis clients for scaling
    if (process.env.REDIS_URL) {
      try {
        this.pubClient = redis.createClient({ url: process.env.REDIS_URL });
        this.subClient = this.pubClient.duplicate();
        
        await this.pubClient.connect();
        await this.subClient.connect();
        
        console.log('✅ Redis connected for Socket.IO adapter');
      } catch (error) {
        console.error('❌ Redis connection failed:', error);
        // Continue without Redis (single server mode)
      }
    }
    
    // Configure Socket.IO
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 30000,
      pingInterval: 25000,
      connectTimeout: 45000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: process.env.NODE_ENV === 'production' 
        ? ['websocket'] 
        : ['websocket', 'polling'],
      allowEIO3: true,
      perMessageDeflate: process.env.NODE_ENV === 'production' ? {
        threshold: 1024,
        zlibDeflateOptions: {
          level: 6
        }
      } : false
    });

    // Use Redis adapter if available
    if (this.pubClient && this.subClient) {
      this.io.adapter(createAdapter(this.pubClient, this.subClient));
    }

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startMaintenanceTasks();

    console.log('✅ Production WebSocket Service initialized');
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔌 Transport: ${process.env.NODE_ENV === 'production' ? 'WebSocket only' : 'WebSocket + Polling'}`);
    console.log(`🗄️ Redis: ${this.pubClient ? 'Connected' : 'Not configured (single server mode)'}`);
  }

  setupMiddleware() {
    // Connection rate limiting
    const connectionLimiter = new Map();
    
    this.io.use(async (socket, next) => {
      try {
        const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                        socket.handshake.address;
        
        // Rate limiting per IP
        const now = Date.now();
        const ipLimit = connectionLimiter.get(clientIP);
        
        if (ipLimit && now - ipLimit.timestamp < 1000 && ipLimit.count > 10) {
          return next(new Error('Too many connection attempts'));
        }
        
        connectionLimiter.set(clientIP, {
          timestamp: now,
          count: (ipLimit?.count || 0) + 1
        });
        
        // Check max connections per IP
        const ipConnections = this.connectionTracker.getIPConnectionCount(clientIP);
        if (ipConnections >= 5) {
          return next(new Error('Maximum connections per IP reached'));
        }
        
        // Token validation
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('No token provided'));
        }

        // Verify JWT
        jwt.verify(token, getKey, {
          algorithms: ['RS256'],
          issuer: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
          audience: process.env.FIREBASE_PROJECT_ID,
        }, async (err, decoded) => {
          if (err) {
            console.log('❌ Invalid token:', err.message);
            return next(new Error('Invalid token'));
          }

          const userId = decoded.user_id;
          
          // Get or create user
          let user = await users().findOne({ uid: userId });
          
          if (!user) {
            // Auto-create user
            user = {
              uid: userId,
              email: decoded.email,
              username: decoded.email?.split('@')[0] || `user${userId.substring(0, 6)}`,
              profileImage: '',
              bio: '',
              followers: [],
              following: [],
              savedReels: [],
              followersCount: 0,
              followingCount: 0,
              isVerified: false,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await users().insertOne(user);
            console.log('👤 Auto-created user:', user.username);
          }

          socket.user = user;
          socket.userId = userId;
          
          // Add connection metadata
          socket.connectionMetadata = {
            platform: socket.handshake.query.platform,
            appState: socket.handshake.query.appState,
            version: socket.handshake.query.version,
            userAgent: socket.handshake.headers['user-agent'],
            ip: clientIP
          };
          
          next();
        });
        
        // Cleanup rate limiter
        if (connectionLimiter.size > 1000) {
          const cutoff = now - 60000;
          for (const [ip, limit] of connectionLimiter.entries()) {
            if (limit.timestamp < cutoff) {
              connectionLimiter.delete(ip);
            }
          }
        }
        
      } catch (err) {
        console.error('❌ Socket authentication error:', err);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`\n🔌 NEW CONNECTION ==================`);
      console.log(`✅ User: ${socket.user.username} (${socket.userId})`);
      console.log(`✅ Socket ID: ${socket.id}`);
      console.log(`✅ Platform: ${socket.connectionMetadata.platform}`);
      console.log(`✅ Version: ${socket.connectionMetadata.version}`);
      console.log(`✅ App State: ${socket.connectionMetadata.appState}`);
      
      // Track connection
      this.connectionTracker.addConnection(
        socket.id, 
        socket.userId, 
        socket.connectionMetadata
      );
      
      // Initialize room subscriptions
      this.roomSubscriptions.set(socket.id, new Set());
      
      // Join user's personal room
      const userRoom = `user:${socket.userId}`;
      socket.join(userRoom);
      this.trackRoomJoin(socket.id, userRoom);
      
      const stats = this.connectionTracker.getStats();
      console.log(`📊 Total connections: ${stats.totalConnections}`);
      console.log(`📊 User connections: ${this.connectionTracker.getConnectionsByUser(socket.userId).length}`);
      console.log(`=====================================\n`);

      // Rate limiter for events
      const checkRateLimit = (event) => {
        if (!this.rateLimiter.check(`${socket.userId}:${event}`, 100)) {
          socket.emit('error', { 
            message: 'Rate limit exceeded', 
            code: 'RATE_LIMIT'
          });
          return false;
        }
        this.connectionTracker.updateActivity(socket.id);
        return true;
      };

      // Ping/Pong
      socket.on('ping', (data) => {
        if (!checkRateLimit('ping')) return;
        
        this.connectionTracker.recordPing(socket.id);
        
        if (data.appState) {
          this.connectionTracker.updateAppState(socket.id, data.appState);
        }
        
        socket.emit('pong', { 
          timestamp: Date.now(),
          serverTime: new Date().toISOString()
        });
      });

      socket.on('pong', () => {
        this.connectionTracker.recordPong(socket.id);
      });

      // App state
      socket.on('app:state:change', (data) => {
        if (!checkRateLimit('app:state:change')) return;
        
        this.connectionTracker.updateAppState(socket.id, data.state);
        console.log(`📱 ${socket.user.username} app state: ${data.state}`);
      });

      // App initialization
      socket.on('app:initialize', async (data) => {
        if (!checkRateLimit('app:initialize')) return;
        await this.handleAppInitialize(socket, data);
      });

      socket.on('app:refresh', async (data) => {
        if (!checkRateLimit('app:refresh')) return;
        await this.handleAppRefresh(socket, data);
      });

      // Feed
      socket.on('feed:loadMore', async (data) => {
        if (!checkRateLimit('feed:loadMore')) return;
        await this.handleLoadMoreReels(socket, data);
      });

      // Profile
      socket.on('profile:view', async (data) => {
        if (!checkRateLimit('profile:view')) return;
        await this.handleProfileView(socket, data);
      });

      socket.on('profile:update', async (data) => {
        if (!checkRateLimit('profile:update')) return;
        await this.handleProfileUpdate(socket, data);
      });

      socket.on('profile:subscribe', (data) => {
        if (!checkRateLimit('profile:subscribe')) return;
        if (data.userId) {
          socket.join(`profile:${data.userId}`);
          this.trackRoomJoin(socket.id, `profile:${data.userId}`);
        }
      });

      socket.on('profile:unsubscribe', (data) => {
        if (data.userId) {
          socket.leave(`profile:${data.userId}`);
          this.trackRoomLeave(socket.id, `profile:${data.userId}`);
        }
      });

      socket.on('profile:stats:update', async (data) => {
        if (!checkRateLimit('profile:stats:update')) return;
        await this.handleProfileStatsUpdate(socket, data);
      });

      // Follow/Unfollow
      socket.on('user:follow', async (data) => {
        if (!checkRateLimit('user:follow')) return;
        await this.handleUserFollow(socket, data);
      });

      socket.on('user:unfollow', async (data) => {
        if (!checkRateLimit('user:unfollow')) return;
        await this.handleUserUnfollow(socket, data);
      });

      // Reel events
      socket.on('reel:join', (data) => {
        if (!checkRateLimit('reel:join')) return;
        this.handleReelJoin(socket, data);
      });

      socket.on('reel:leave', (data) => {
        if (!checkRateLimit('reel:leave')) return;
        this.handleReelLeave(socket, data);
      });

      socket.on('reel:like', async (data) => {
        if (!checkRateLimit('reel:like')) return;
        await this.handleReelLike(socket, data);
      });

      socket.on('reel:save', async (data) => {
        if (!checkRateLimit('reel:save')) return;
        await this.handleReelSave(socket, data);
      });

      // Comments
      socket.on('comments:load', async (data) => {
        if (!checkRateLimit('comments:load')) return;
        await this.handleLoadComments(socket, data);
      });

      socket.on('comment:add', async (data) => {
        if (!checkRateLimit('comment:add')) return;
        await this.handleAddComment(socket, data);
      });

      socket.on('comment:like', async (data) => {
        if (!checkRateLimit('comment:like')) return;
        await this.handleLikeComment(socket, data);
      });

      socket.on('comment:edit', async (data) => {
        if (!checkRateLimit('comment:edit')) return;
        await this.handleEditComment(socket, data);
      });

      socket.on('comment:delete', async (data) => {
        if (!checkRateLimit('comment:delete')) return;
        await this.handleDeleteComment(socket, data);
      });

      // Typing indicators
      socket.on('comment:typing:start', (data) => {
        if (!checkRateLimit('comment:typing:start')) return;
        this.handleTypingStart(socket, data);
      });

      socket.on('comment:typing:stop', (data) => {
        if (!checkRateLimit('comment:typing:stop')) return;
        this.handleTypingStop(socket, data);
      });

      // Viewer heartbeat
      socket.on('viewer:heartbeat', (data) => {
        if (!checkRateLimit('viewer:heartbeat')) return;
        if (data.reelId && this.activeViewers.has(data.reelId)) {
          this.connectionTracker.updateActivity(socket.id);
        }
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.user.username}:`, error);
        this.connectionTracker.updateActivity(socket.id);
      });
    });
  }

  // Room tracking
  trackRoomJoin(socketId, room) {
    const rooms = this.roomSubscriptions.get(socketId);
    if (rooms) {
      rooms.add(room);
    }
  }

  trackRoomLeave(socketId, room) {
    const rooms = this.roomSubscriptions.get(socketId);
    if (rooms) {
      rooms.delete(room);
    }
  }

  // Maintenance tasks
  startMaintenanceTasks() {
    // Cleanup stale connections every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.connectionTracker.cleanupStaleConnections(this.io);
      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} stale connections`);
      }
    }, 5 * 60 * 1000);

    // Health check every minute
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60 * 1000);

    // Rate limiter cleanup every 5 minutes
    this.rateLimiterCleanupInterval = setInterval(() => {
      this.rateLimiter.cleanup();
    }, 5 * 60 * 1000);

    // Log stats every 10 minutes
    setInterval(() => {
      this.logConnectionStats();
    }, 10 * 60 * 1000);
  }

  performHealthCheck() {
    const now = Date.now();
    
    for (const [socketId, health] of this.connectionTracker.connectionHealth.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) continue;
      
      const timeSinceLastPong = now - health.lastPong;
      
      // If no pong received in 45 seconds, consider unhealthy
      if (timeSinceLastPong > 45000) {
        this.connectionTracker.recordMissedPing(socketId);
        
        if (health.missedPings > 2) {
          console.log(`⚠️ Disconnecting unhealthy socket: ${socketId}`);
          socket.disconnect(true);
        }
      }
    }
  }

  logConnectionStats() {
    const stats = this.connectionTracker.getStats();
    
    console.log(`\n📊 CONNECTION STATS ================`);
    console.log(`Total connections: ${stats.totalConnections}`);
    console.log(`Active connections: ${stats.activeConnections}`);
    console.log(`Unique users: ${stats.uniqueUsers}`);
    console.log(`Unique IPs: ${stats.uniqueIPs}`);
    console.log(`Average latency: ${stats.avgLatency}ms`);
    console.log(`Platform breakdown:`, stats.platformBreakdown);
    console.log(`Active rooms: ${this.io.sockets.adapter.rooms.size}`);
    console.log(`=====================================\n`);
  }

  // Event Handlers
  async handleAppInitialize(socket, data) {
    try {
      const { feedType = 'home', skip = 0, limit = 20, forceRefresh = false } = data;
      
      console.log(`🎮 App init: ${socket.user.username}, feed: ${feedType}, refresh: ${forceRefresh}`);
      
      // Get user's saved reels
      const currentUser = await users().findOne({ uid: socket.userId });
      const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];
      
      // Build query
      let query = { 
        status: { $ne: 'deleted' },
        'streamData.status.state': 'ready'
      };
      
      if (feedType === 'following' && currentUser?.following?.length > 0) {
        query.uid = { $in: currentUser.following };
      } else if (feedType === 'trending') {
        // Add trending logic (e.g., based on recent likes/views)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query['stats.lastActivity'] = { $gte: oneDayAgo };
      }
      
      const reelDocs = await reels()
        .find(query)
        .sort(feedType === 'trending' ? { 'stats.likes': -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Process reels
      const processedReels = await this.processReelsForClient(
        reelDocs, 
        socket.userId, 
        userSavedReels
      );

      socket.emit('app:data', {
        reels: processedReels,
        hasMore: reelDocs.length === limit,
        timestamp: new Date(),
        feedType
      });

    } catch (error) {
      console.error('Error initializing app:', error);
      socket.emit('error', { 
        message: 'Failed to initialize app data',
        code: 'INIT_ERROR'
      });
    }
  }

  async handleAppRefresh(socket, data) {
    await this.handleAppInitialize(socket, { ...data, forceRefresh: true });
  }

  async handleLoadMoreReels(socket, data) {
    try {
      const { skip = 0, limit = 10, feedType = 'home' } = data;
      
      const currentUser = await users().findOne({ uid: socket.userId });
      const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];
      
      let query = { 
        status: { $ne: 'deleted' },
        'streamData.status.state': 'ready'
      };
      
      if (feedType === 'following' && currentUser?.following?.length > 0) {
        query.uid = { $in: currentUser.following };
      }
      
      const moreReels = await reels()
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      const processedReels = await this.processReelsForClient(
        moreReels, 
        socket.userId, 
        userSavedReels
      );
      
      socket.emit('app:data', {
        reels: processedReels,
        hasMore: moreReels.length === limit,
        isLoadMore: true,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error loading more reels:', error);
      socket.emit('error', { 
        message: 'Failed to load more reels',
        code: 'LOAD_MORE_ERROR'
      });
    }
  }

  async processReelsForClient(reelDocs, userId, userSavedReels) {
    return Promise.all(
      reelDocs.map(async (reel) => {
        const creator = await users().findOne(
          { uid: reel.uid },
          { projection: { username: 1, profileImage: 1, isVerified: 1 } }
        );

        const videoUrl = this.getVideoUrl(reel);
        if (!videoUrl) {
          console.warn(`No video URL for reel ${reel._id}`);
          return null;
        }

        const likes = Array.isArray(reel.likes) ? reel.likes : [];
        
        return {
          _id: reel._id.toString(),
          uid: reel.uid || '',
          username: creator?.username || reel.username || 'anonymous',
          profileImage: creator?.profileImage || reel.profileImage || '',
          title: reel.title || '',
          description: reel.description || '',
          hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
          videoUrl,
          thumbnailUrl: this.getThumbnailUrl(reel),
          streamVideoId: reel.streamVideoId,
          streamData: reel.streamData,
          duration: reel.streamData?.duration || reel.duration || 0,
          likes,
          likesCount: reel.stats?.likes || likes.length,
          isLiked: likes.includes(userId),
          isSaved: userSavedReels.includes(reel._id.toString()),
          commentsCount: reel.stats?.comments || 0,
          savesCount: reel.stats?.saves || 0,
          viewers: this.getViewerCount(reel._id.toString()),
          views: reel.stats?.views || reel.views || 0,
          createdAt: reel.createdAt,
          updatedAt: reel.updatedAt,
          user: {
            uid: reel.uid,
            username: creator?.username || reel.username || 'anonymous',
            profileImage: creator?.profileImage || reel.profileImage || '',
            isVerified: creator?.isVerified || false
          },
          isCloudflareStream: reel.isCloudflareStream || false
        };
      })
    ).then(reels => reels.filter(reel => reel !== null));
  }

  async handleProfileView(socket, data) {
    try {
      const { userId } = data;
      
      // Join profile room
      socket.join(`profile:${userId}`);
      this.trackRoomJoin(socket.id, `profile:${userId}`);
      
      const profile = await users().findOne({ uid: userId });
      if (!profile) {
        return socket.emit('error', { message: 'Profile not found' });
      }

      // Get user's reels
      const userReels = await reels()
        .find({ 
          uid: userId,
          status: { $ne: 'deleted' }
        })
        .sort({ createdAt: -1 })
        .toArray();

      const totalLikes = userReels.reduce((sum, reel) => sum + (reel.stats?.likes || 0), 0);
      const totalViews = userReels.reduce((sum, reel) => sum + (reel.stats?.views || 0), 0);

      socket.emit('profile:data', {
        profile: {
          uid: profile.uid,
          username: profile.username,
          profileImage: profile.profileImage,
          bio: profile.bio,
          followersCount: profile.followersCount || profile.followers?.length || 0,
          followingCount: profile.followingCount || profile.following?.length || 0,
          isVerified: profile.isVerified || false,
          reelsCount: userReels.length,
          totalLikes,
          totalViews,
          isFollowing: profile.followers?.includes(socket.userId) || false
        }
      });

    } catch (error) {
      console.error('Error viewing profile:', error);
      socket.emit('error', { message: 'Failed to load profile' });
    }
  }

  async handleProfileUpdate(socket, data) {
    try {
      const { updates } = data;
      
      // Validate updates
      const allowedFields = ['username', 'bio', 'profileImage'];
      const filteredUpdates = {};
      
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }
      
      if (Object.keys(filteredUpdates).length === 0) {
        return socket.emit('error', { message: 'No valid updates provided' });
      }
      
      // Update user
      await users().updateOne(
        { uid: socket.userId },
        { 
          $set: {
            ...filteredUpdates,
            updatedAt: new Date()
          }
        }
      );

      // Emit to all clients viewing this profile
      this.io.to(`profile:${socket.userId}`).emit('profile:updated', {
        userId: socket.userId,
        updates: filteredUpdates
      });

      socket.emit('profile:update:ack', { success: true });

    } catch (error) {
      console.error('Error updating profile:', error);
      socket.emit('error', { message: 'Failed to update profile' });
    }
  }

  async handleProfileStatsUpdate(socket, data) {
    try {
      const { userId, followersCount, followingCount, isRelative } = data;
      
      console.log(`📊 Profile stats update for ${userId}:`, data);
      
      if (isRelative) {
        // Handle relative updates
        const updateQuery = {};
        
        if (followersCount !== undefined && followersCount !== 0) {
          updateQuery['$inc'] = updateQuery['$inc'] || {};
          updateQuery['$inc']['followersCount'] = followersCount;
        }
        
        if (followingCount !== undefined && followingCount !== 0) {
          updateQuery['$inc'] = updateQuery['$inc'] || {};
          updateQuery['$inc']['followingCount'] = followingCount;
        }
        
        if (Object.keys(updateQuery).length > 0) {
          await users().updateOne({ uid: userId }, updateQuery);
        }
      } else {
        // Handle absolute updates
        const updateFields = {};
        
        if (followersCount !== undefined) {
          updateFields.followersCount = followersCount;
        }
        
        if (followingCount !== undefined) {
          updateFields.followingCount = followingCount;
        }
        
        if (Object.keys(updateFields).length > 0) {
          await users().updateOne(
            { uid: userId },
            { $set: updateFields }
          );
        }
      }
      
      // Get updated user data
      const updatedUser = await users().findOne({ uid: userId });
      
      if (updatedUser) {
        const statsUpdate = {
          userId,
          followersCount: updatedUser.followersCount || updatedUser.followers?.length || 0,
          followingCount: updatedUser.followingCount || updatedUser.following?.length || 0
        };
        
        // Emit to user and profile viewers
        this.io.to(`user:${userId}`).emit('profile:stats:update', statsUpdate);
        this.io.to(`profile:${userId}`).emit('profile:stats:update', statsUpdate);
      }
      
    } catch (error) {
      console.error('Error updating profile stats:', error);
      socket.emit('error', { message: 'Failed to update profile stats' });
    }
  }

  async handleUserFollow(socket, data) {
    try {
      const { targetUserId } = data;
      
      console.log(`👥 ${socket.user.username} following ${targetUserId}`);
      
      const currentUser = await users().findOne({ uid: socket.userId });
      const targetUser = await users().findOne({ uid: targetUserId });

      if (!targetUser) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Check if already following
      if (currentUser.following?.includes(targetUserId)) {
        return socket.emit('error', { message: 'Already following this user' });
      }

      // Update both users
      await users().updateOne(
        { uid: socket.userId },
        { 
          $addToSet: { following: targetUserId },
          $set: { followingCount: (currentUser.following?.length || 0) + 1 }
        }
      );

      await users().updateOne(
        { uid: targetUserId },
        { 
          $addToSet: { followers: socket.userId },
          $set: { followersCount: (targetUser.followers?.length || 0) + 1 }
        }
      );

      // Get updated users
      const updatedCurrentUser = await users().findOne({ uid: socket.userId });
      const updatedTargetUser = await users().findOne({ uid: targetUserId });

      // Emit acknowledgment
      socket.emit('user:follow:ack', {
        userId: socket.userId,
        targetUserId,
        following: true
      });

      // Emit stats updates
      this.io.to(`user:${socket.userId}`).emit('profile:stats:update', {
        userId: socket.userId,
        followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
      });

      this.io.to(`user:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
      });
      
      // Emit to profile viewers
      this.io.to(`profile:${socket.userId}`).emit('profile:stats:update', {
        userId: socket.userId,
        followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
      });
      
      this.io.to(`profile:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
      });

      // Emit follower notification
      this.io.to(`user:${targetUserId}`).emit('profile:follower:new', {
        follower: {
          uid: socket.userId,
          username: currentUser.username,
          profileImage: currentUser.profileImage,
          isVerified: currentUser.isVerified
        },
        targetUserId
      });

      // Create notification
      await createNotification({
        type: 'follow',
        recipientUid: targetUserId,
        senderUid: socket.userId,
        senderName: currentUser.username,
        senderImage: currentUser.profileImage,
        message: `${currentUser.username} started following you`
      });

    } catch (error) {
      console.error('Error following user:', error);
      socket.emit('error', { message: 'Failed to follow user' });
    }
  }

  async handleUserUnfollow(socket, data) {
    try {
      const { targetUserId } = data;
      
      const currentUser = await users().findOne({ uid: socket.userId });
      const targetUser = await users().findOne({ uid: targetUserId });

      if (!targetUser) {
        return socket.emit('error', { message: 'User not found' });
      }

      // Update both users
      await users().updateOne(
        { uid: socket.userId },
        { 
          $pull: { following: targetUserId },
          $set: { followingCount: Math.max(0, (currentUser.following?.length || 1) - 1) }
        }
      );

      await users().updateOne(
        { uid: targetUserId },
        { 
          $pull: { followers: socket.userId },
          $set: { followersCount: Math.max(0, (targetUser.followers?.length || 1) - 1) }
        }
      );

      // Get updated users
      const updatedCurrentUser = await users().findOne({ uid: socket.userId });
      const updatedTargetUser = await users().findOne({ uid: targetUserId });

      // Emit acknowledgment
      socket.emit('user:unfollow:ack', {
        userId: socket.userId,
        targetUserId,
        following: false
      });

      // Emit stats updates
      this.io.to(`user:${socket.userId}`).emit('profile:stats:update', {
        userId: socket.userId,
        followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
      });

      this.io.to(`user:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
      });
      
      // Emit to profile viewers
      this.io.to(`profile:${socket.userId}`).emit('profile:stats:update', {
        userId: socket.userId,
        followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
      });
      
      this.io.to(`profile:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
      });

      // Emit follower removed
      this.io.to(`user:${targetUserId}`).emit('profile:follower:removed', {
        userId: socket.userId,
        targetUserId
      });

    } catch (error) {
      console.error('Error unfollowing user:', error);
      socket.emit('error', { message: 'Failed to unfollow user' });
    }
  }

  handleReelJoin(socket, data) {
    const { reelId } = data;
    const roomName = `reel:${reelId}`;
    
    socket.join(roomName);
    this.trackRoomJoin(socket.id, roomName);
    
    console.log(`👁️ ${socket.user.username} joined ${roomName}`);
    
    // Add to active viewers
    if (!this.activeViewers.has(reelId)) {
      this.activeViewers.set(reelId, new Set());
    }
    
    this.activeViewers.get(reelId).add(socket.userId);
    
    const viewerCount = this.activeViewers.get(reelId).size;
    
    // Emit viewer count
    this.io.to(roomName).emit('viewers:update', {
      reelId,
      count: viewerCount
    });

    // Increment view count
    this.incrementViewCount(reelId, socket.userId);
    
    socket.emit('reel:joined', {
      reelId,
      viewerCount,
      success: true
    });
  }

  async incrementViewCount(reelId, userId) {
    try {
      await reels().updateOne(
        { _id: new ObjectId(reelId) },
        { 
          $inc: { 
            'stats.views': 1,
            'views': 1 
          },
          $set: {
            'stats.lastActivity': new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  handleReelLeave(socket, data) {
    const { reelId } = data;
    const roomName = `reel:${reelId}`;
    
    socket.leave(roomName);
    this.trackRoomLeave(socket.id, roomName);
    
    // Remove from active viewers
    if (this.activeViewers.has(reelId)) {
      this.activeViewers.get(reelId).delete(socket.userId);
      
      const viewerCount = this.activeViewers.get(reelId).size;
      
      if (viewerCount === 0) {
        this.activeViewers.delete(reelId);
      } else {
        this.io.to(roomName).emit('viewers:update', {
          reelId,
          count: viewerCount
        });
      }
    }
    
    // Clean up typing indicators
    if (this.typingUsers.has(reelId)) {
      this.typingUsers.get(reelId).delete(socket.userId);
      this.emitTypingUpdate(reelId);
    }
    
    socket.emit('reel:left', {
      reelId,
      success: true
    });
  }

  async handleReelLike(socket, data) {
    try {
      const { reelId, isLiked } = data;
      
      console.log(`❤️ ${socket.user.username} ${isLiked ? 'liking' : 'unliking'} reel ${reelId}`);
      
      if (!ObjectId.isValid(reelId)) {
        return socket.emit('error', { message: 'Invalid reel ID' });
      }

      const reel = await reels().findOne({ _id: new ObjectId(reelId) });
      if (!reel) {
        return socket.emit('error', { message: 'Reel not found' });
      }

      const isCurrentlyLiked = reel.likes && reel.likes.includes(socket.userId);
      
      const update = isLiked
        ? { $addToSet: { likes: socket.userId } }
        : { $pull: { likes: socket.userId } };
      
      const result = await reels().findOneAndUpdate(
        { _id: new ObjectId(reelId) },
        update,
        { returnDocument: 'after' }
      );

      if (result.value) {
        const totalLikes = result.value.likes?.length || 0;
        
        // Update stats
        await reels().updateOne(
          { _id: new ObjectId(reelId) },
          { 
            $set: { 
              'stats.likes': totalLikes,
              'stats.lastActivity': new Date()
            } 
          }
        );
        
        // Emit acknowledgment
        socket.emit('reel:like:ack', {
          reelId,
          isLiked,
          totalLikes,
          likesCount: totalLikes
        });
        
        // Emit to all viewers
        this.io.to(`reel:${reelId}`).emit('reel:liked', {
          reelId,
          userId: socket.userId,
          isLiked,
          totalLikes,
          likesCount: totalLikes
        });

        // Create notification
        if (isLiked && !isCurrentlyLiked && result.value.uid !== socket.userId) {
          await createNotification({
            type: 'like',
            recipientUid: result.value.uid,
            senderUid: socket.userId,
            senderName: socket.user.username,
            senderImage: socket.user.profileImage,
            reelId: reelId,
            reelTitle: result.value.title,
            message: `${socket.user.username} liked your flick`
          });
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
      socket.emit('error', { message: 'Failed to process like' });
    }
  }

  async handleReelSave(socket, data) {
    try {
      const { reelId, isSaved } = data;
      
      console.log(`💾 ${socket.user.username} ${isSaved ? 'saving' : 'unsaving'} reel ${reelId}`);
      
      if (!ObjectId.isValid(reelId)) {
        return socket.emit('error', { message: 'Invalid reel ID' });
      }
      
      const reel = await reels().findOne({ _id: new ObjectId(reelId) });
      if (!reel) {
        return socket.emit('error', { message: 'Reel not found' });
      }
      
      // Update user's savedReels
      const userUpdate = isSaved
        ? { $addToSet: { savedReels: new ObjectId(reelId) } }
        : { $pull: { savedReels: new ObjectId(reelId) } };
      
      const result = await users().updateOne(
        { uid: socket.userId },
        userUpdate
      );
      
      if (result.modifiedCount === 0 && result.matchedCount === 0) {
        return socket.emit('error', { message: 'User not found' });
      }
      
      // Update reel save count
      const saves = await users().countDocuments({
        savedReels: new ObjectId(reelId)
      });
      
      await reels().updateOne(
        { _id: new ObjectId(reelId) },
        { 
          $set: { 
            'stats.saves': saves,
            'stats.lastActivity': new Date()
          } 
        }
      );
      
      // Get updated user
      const updatedUser = await users().findOne({ uid: socket.userId });
      const savedCount = updatedUser?.savedReels?.length || 0;
      
      // Emit acknowledgment
      socket.emit('reel:save:ack', {
        reelId,
        isSaved,
        savedCount,
        savesCount: saves,
        totalSaves: saves
      });
      
      // Emit to all viewers
      this.io.to(`reel:${reelId}`).emit('reel:saved', {
        reelId,
        userId: socket.userId,
        isSaved,
        savesCount: saves,
        totalSaves: saves
      });
      
      // Create notification
      if (isSaved && reel.uid !== socket.userId) {
        await createNotification({
          type: 'save',
          recipientUid: reel.uid,
          senderUid: socket.userId,
          senderName: socket.user.username,
          senderImage: socket.user.profileImage,
          reelId: reelId,
          reelTitle: reel.title || 'your flick',
          message: `${socket.user.username} saved your flick`
        });
      }
      
    } catch (error) {
      console.error('Error handling save:', error);
      socket.emit('error', { message: 'Failed to process save' });
    }
  }

  async handleLoadComments(socket, data) {
    try {
      const { reelId, skip = 0, limit = 20 } = data;
      
      if (!ObjectId.isValid(reelId)) {
        return socket.emit('error', { message: 'Invalid reel ID' });
      }
      
      // Get comments with user data
      const commentDocs = await comments()
        .aggregate([
          { 
            $match: { 
              reelId: new ObjectId(reelId),
              deletedAt: { $exists: false }
            } 
          },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'uid',
              foreignField: 'uid',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              uid: 1,
              text: 1,
              likes: 1,
              likeCount: { $size: { $ifNull: ['$likes', []] } },
              parentCommentId: 1,
              replyToUserId: 1,
              replyToUsername: 1,
              createdAt: 1,
              editedAt: 1,
              'user.username': 1,
              'user.profileImage': 1,
              'user.isVerified': 1
            }
          }
        ])
        .toArray();
      
      // Build nested comments
      const nestedComments = this.buildNestedComments(commentDocs, socket.userId);
      
      socket.emit('comments:loaded', {
        reelId,
        comments: nestedComments,
        hasMore: commentDocs.length === limit
      });
      
    } catch (error) {
      console.error('Error loading comments:', error);
      socket.emit('error', { message: 'Failed to load comments' });
    }
  }

  buildNestedComments(commentDocs, currentUserId) {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create comment objects
    commentDocs.forEach(doc => {
      const comment = {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        uid: doc.uid,
        text: doc.text,
        user: doc.user || {
          uid: doc.uid,
          username: 'Anonymous',
          profileImage: `https://i.pravatar.cc/150?u=${doc.uid}`,
          isVerified: false
        },
        username: doc.user?.username || 'Anonymous',
        profileImage: doc.user?.profileImage || `https://i.pravatar.cc/150?u=${doc.uid}`,
        isVerified: doc.user?.isVerified || false,
        createdAt: doc.createdAt,
        editedAt: doc.editedAt,
        likes: doc.likes || [],
        likeCount: doc.likeCount || 0,
        isLiked: doc.likes?.includes(currentUserId) || false,
        parentCommentId: doc.parentCommentId?.toString() || null,
        replyToUserId: doc.replyToUserId,
        replyToUsername: doc.replyToUsername,
        replies: [],
        replyCount: 0,
        timestamp: doc.createdAt.toISOString()
      };
      commentMap.set(comment.id, comment);
    });

    // Second pass: build hierarchy
    commentMap.forEach(comment => {
      if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
        const parent = commentMap.get(comment.parentCommentId);
        parent.replies.push(comment);
        parent.replyCount = parent.replies.length;
      } else if (!comment.parentCommentId) {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  async handleAddComment(socket, data) {
    try {
      const { reelId, text, parentCommentId = null, replyToUserId = null, replyToUsername = null } = data;
      
      if (!text || text.trim().length === 0) {
        return socket.emit('error', { message: 'Comment text is required' });
      }
      
      if (!ObjectId.isValid(reelId)) {
        return socket.emit('error', { message: 'Invalid reel ID' });
      }
      
      // Check if reel exists
      const reel = await reels().findOne({ _id: new ObjectId(reelId) });
      if (!reel) {
        return socket.emit('error', { message: 'Reel not found' });
      }
      
      // Create comment
      const comment = {
        _id: new ObjectId(),
        reelId: new ObjectId(reelId),
        uid: socket.userId,
        text: text.trim(),
        likes: [],
        parentCommentId: parentCommentId ? new ObjectId(parentCommentId) : null,
        replyToUserId,
        replyToUsername,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await comments().insertOne(comment);
      
      // Update comment count
      await reels().updateOne(
        { _id: new ObjectId(reelId) },
        { 
          $inc: { 'stats.comments': 1 },
          $set: { 'stats.lastActivity': new Date() }
        }
      );
      
      // Prepare comment data for emission
      const commentData = {
        id: comment._id.toString(),
        _id: comment._id.toString(),
        uid: comment.uid,
        username: socket.user.username,
        profileImage: socket.user.profileImage,
        text: comment.text,
        isVerified: socket.user.isVerified || false,
        createdAt: comment.createdAt,
        parentCommentId: comment.parentCommentId?.toString() || null,
        replyToUsername: comment.replyToUsername,
        likes: 0,
        likeCount: 0,
        isLiked: false,
        replies: [],
        replyCount: 0,
        user: {
          uid: socket.user.uid,
          username: socket.user.username,
          profileImage: socket.user.profileImage,
          isVerified: socket.user.isVerified || false
        }
      };
      
      // Emit to all in room
      this.io.to(`reel:${reelId}`).emit('comment:new', {
        reelId,
        comment: commentData,
        type: parentCommentId ? 'reply' : 'comment',
        parentCommentId: parentCommentId
      });
      
      // Create notification
      if (reel.uid !== socket.userId) {
        await createNotification({
          type: 'comment',
          recipientUid: reel.uid,
          senderUid: socket.userId,
          senderName: socket.user.username,
          senderImage: socket.user.profileImage,
          reelId: reelId,
          reelTitle: reel.title,
          comment: text.substring(0, 100),
          message: `${socket.user.username} commented on your flick`
        });
      }
      
      // Notify parent comment author for replies
      if (parentCommentId && replyToUserId && replyToUserId !== socket.userId) {
        await createNotification({
          type: 'reply',
          recipientUid: replyToUserId,
          senderUid: socket.userId,
          senderName: socket.user.username,
          senderImage: socket.user.profileImage,
          reelId: reelId,
          reelTitle: reel.title,
          comment: text.substring(0, 100),
          message: `${socket.user.username} replied to your comment`
        });
      }
      
    } catch (error) {
      console.error('Error adding comment:', error);
      socket.emit('error', { message: 'Failed to add comment' });
    }
  }

  async handleLikeComment(socket, data) {
    try {
      const { reelId, commentId, isLiked, parentCommentId = null } = data;
      
      if (!ObjectId.isValid(commentId)) {
        return socket.emit('error', { message: 'Invalid comment ID' });
      }
      
      const update = isLiked
        ? { $addToSet: { likes: socket.userId } }
        : { $pull: { likes: socket.userId } };
      
      const result = await comments().findOneAndUpdate(
        { _id: new ObjectId(commentId) },
        update,
        { returnDocument: 'after' }
      );
      
      if (result.value) {
        const likeCount = result.value.likes?.length || 0;
        
        // Emit to all in room
        this.io.to(`reel:${reelId}`).emit('comment:liked', {
          reelId,
          commentId,
          userId: socket.userId,
          isLiked,
          likeCount,
          parentCommentId
        });
        
        // Create notification for comment like
        if (isLiked && result.value.uid !== socket.userId) {
          const reel = await reels().findOne({ _id: new ObjectId(reelId) });
          
          await createNotification({
            type: 'comment_like',
            recipientUid: result.value.uid,
            senderUid: socket.userId,
            senderName: socket.user.username,
            senderImage: socket.user.profileImage,
            reelId: reelId,
            reelTitle: reel?.title,
            comment: result.value.text.substring(0, 100),
            message: `${socket.user.username} liked your comment`
          });
        }
      }
      
    } catch (error) {
      console.error('Error liking comment:', error);
      socket.emit('error', { message: 'Failed to like comment' });
    }
  }

  async handleEditComment(socket, data) {
    try {
      const { reelId, commentId, text, parentCommentId = null } = data;
      
      if (!text || text.trim().length === 0) {
        return socket.emit('error', { message: 'Comment text is required' });
      }
      
      if (!ObjectId.isValid(commentId)) {
        return socket.emit('error', { message: 'Invalid comment ID' });
      }
      
      // Verify ownership
      const comment = await comments().findOne({ _id: new ObjectId(commentId) });
      if (!comment || comment.uid !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }
      
      // Update comment
      const editedAt = new Date();
      await comments().updateOne(
        { _id: new ObjectId(commentId) },
        { 
          $set: { 
            text: text.trim(),
            editedAt,
            updatedAt: editedAt
          } 
        }
      );
      
      // Emit to all in room
      this.io.to(`reel:${reelId}`).emit('comment:edited', {
        reelId,
        commentId,
        text: text.trim(),
        editedAt,
        parentCommentId
      });
      
    } catch (error) {
      console.error('Error editing comment:', error);
      socket.emit('error', { message: 'Failed to edit comment' });
    }
  }

  async handleDeleteComment(socket, data) {
    try {
      const { reelId, commentId, parentCommentId = null } = data;
      
      if (!ObjectId.isValid(commentId)) {
        return socket.emit('error', { message: 'Invalid comment ID' });
      }
      
      // Verify ownership
      const comment = await comments().findOne({ _id: new ObjectId(commentId) });
      if (!comment || comment.uid !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }
      
      // Soft delete
      await comments().updateOne(
        { _id: new ObjectId(commentId) },
        { 
          $set: { 
            deletedAt: new Date(),
            deletedBy: socket.userId
          } 
        }
      );
      
      // Update comment count
      await reels().updateOne(
        { _id: new ObjectId(reelId) },
        { $inc: { 'stats.comments': -1 } }
      );
      
      // Emit to all in room
      this.io.to(`reel:${reelId}`).emit('comment:deleted', {
        reelId,
        commentId,
        parentCommentId
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      socket.emit('error', { message: 'Failed to delete comment' });
    }
  }

  handleTypingStart(socket, data) {
    const { reelId } = data;
    
    if (!this.typingUsers.has(reelId)) {
      this.typingUsers.set(reelId, new Set());
    }
    
    this.typingUsers.get(reelId).add(socket.userId);
    
    // Broadcast to others in the room
    socket.to(`reel:${reelId}`).emit('comment:typing:users', {
      reelId,
      users: Array.from(this.typingUsers.get(reelId)).map(uid => ({
        uid,
        username: this.getUsernameById(uid) || 'Unknown'
      }))
    });
  }

  handleTypingStop(socket, data) {
    const { reelId } = data;
    
    if (this.typingUsers.has(reelId)) {
      this.typingUsers.get(reelId).delete(socket.userId);
      
      socket.to(`reel:${reelId}`).emit('comment:typing:users', {
        reelId,
        users: Array.from(this.typingUsers.get(reelId)).map(uid => ({
          uid,
          username: this.getUsernameById(uid) || 'Unknown'
        }))
      });
      
      // Clean up empty sets
      if (this.typingUsers.get(reelId).size === 0) {
        this.typingUsers.delete(reelId);
      }
    }
  }

  emitTypingUpdate(reelId) {
    const typingList = this.typingUsers.has(reelId) 
      ? Array.from(this.typingUsers.get(reelId)).map(uid => ({
          uid,
          username: this.getUsernameById(uid) || 'Unknown'
        }))
      : [];
      
    this.io.to(`reel:${reelId}`).emit('comment:typing:users', {
      reelId,
      users: typingList
    });
  }

  handleDisconnect(socket, reason) {
    console.log(`\n❌ DISCONNECTION ==================`);
    console.log(`User: ${socket.user.username} (${socket.userId})`);
    console.log(`Reason: ${reason}`);
    console.log(`Socket ID: ${socket.id}`);
    console.log(`Connection duration: ${this.getConnectionDuration(socket.id)}`);
    
    // Clean up connection tracking
    this.connectionTracker.removeConnection(socket.id);
    
    // Clean up room subscriptions
    const rooms = this.roomSubscriptions.get(socket.id);
    if (rooms) {
      rooms.forEach(room => {
        if (room.startsWith('reel:')) {
          this.cleanupReelViewer(room, socket.userId);
        }
      });
      this.roomSubscriptions.delete(socket.id);
    }
    
    // Clean up viewers
    for (const [reelId, viewers] of this.activeViewers.entries()) {
      if (viewers.has(socket.userId)) {
        viewers.delete(socket.userId);
        if (viewers.size === 0) {
          this.activeViewers.delete(reelId);
        } else {
          this.io.to(`reel:${reelId}`).emit('viewers:update', {
            reelId,
            count: viewers.size
          });
        }
      }
    }
    
    // Clean up typing indicators
    for (const [reelId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(socket.userId)) {
        typingSet.delete(socket.userId);
        this.emitTypingUpdate(reelId);
        
        if (typingSet.size === 0) {
          this.typingUsers.delete(reelId);
        }
      }
    }
    
    // Check if user is completely offline
    const remainingConnections = this.connectionTracker.getConnectionsByUser(socket.userId);
    console.log(`📊 Remaining connections for user: ${remainingConnections.length}`);
    
    if (remainingConnections.length === 0) {
      this.io.emit('user:offline', { userId: socket.userId });
    }
    
    console.log(`=====================================\n`);
  }

  // Helper methods
  getConnectionDuration(socketId) {
    const connection = this.connectionTracker.connections.get(socketId);
    if (!connection) return 'unknown';
    
    const duration = Date.now() - new Date(connection.connectedAt).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  cleanupReelViewer(room, userId) {
    const reelId = room.replace('reel:', '');
    if (this.activeViewers.has(reelId)) {
      this.activeViewers.get(reelId).delete(userId);
    }
  }

  getUsernameById(userId) {
    for (const [uid, connection] of this.connectionTracker.connections.entries()) {
      if (connection.userId === userId) {
        const socket = this.io.sockets.sockets.get(connection.socketId);
        return socket?.user?.username || 'Unknown';
      }
    }
    return 'Unknown';
  }

  getVideoUrl(reel) {
    if (reel.streamData?.playback?.hls) {
      return reel.streamData.playback.hls;
    }
    if (reel.streamData?.preview) {
      return reel.streamData.preview;
    }
    if (reel.videoUrl) {
      return reel.videoUrl;
    }
    if (reel.streamVideoId) {
      return `https://customer-kwy8lcu4xp67nayh.cloudflarestream.com/${reel.streamVideoId}/manifest/video.m3u8`;
    }
    return null;
  }

  getThumbnailUrl(reel) {
    if (reel.thumbnailUrl) {
      return reel.thumbnailUrl;
    }
    if (reel.streamVideoId) {
      return `https://customer-kwy8lcu4xp67nayh.cloudflarestream.com/${reel.streamVideoId}/thumbnails/thumbnail.jpg`;
    }
    return `https://via.placeholder.com/640x360/1a1a1a/4285F4?text=${encodeURIComponent((reel.title || 'Video').substring(0, 20))}`;
  }

  getViewerCount(reelId) {
    return this.activeViewers.get(reelId)?.size || 0;
  }

  // Public methods for REST API integration
  emitCommentNew(reelId, comment, type = 'comment', parentCommentId = null) {
    console.log(`📤 Emitting comment:new to room reel:${reelId}`);
    
    const eventData = {
      reelId,
      comment: {
        id: comment._id?.toString() || comment.id,
        _id: comment._id?.toString() || comment.id,
        uid: comment.uid,
        username: comment.username || comment.user?.username || 'Anonymous',
        profileImage: comment.profileImage || comment.user?.profileImage || `https://i.pravatar.cc/150?u=${comment.uid}`,
        text: comment.text,
        isVerified: comment.isVerified || comment.user?.isVerified || false,
        createdAt: comment.createdAt,
        parentCommentId: comment.parentCommentId || null,
        replyToUsername: comment.replyToUsername || null,
        likes: 0,
        likeCount: 0,
        isLiked: false,
        replies: [],
        replyCount: 0,
        user: {
          uid: comment.uid,
          username: comment.username || comment.user?.username || 'Anonymous',
          profileImage: comment.profileImage || comment.user?.profileImage || `https://i.pravatar.cc/150?u=${comment.uid}`,
          isVerified: comment.isVerified || comment.user?.isVerified || false
        }
      },
      type: type,
      parentCommentId: parentCommentId
    };
    
    this.io.to(`reel:${reelId}`).emit('comment:new', eventData);
  }

  emitCommentLiked(reelId, commentId, userId, isLiked, likeCount, parentCommentId = null) {
    this.io.to(`reel:${reelId}`).emit('comment:liked', {
      reelId,
      commentId,
      userId,
      isLiked,
      likeCount,
      parentCommentId
    });
  }

  emitCommentEdited(reelId, commentId, text, editedAt, parentCommentId = null) {
    this.io.to(`reel:${reelId}`).emit('comment:edited', {
      reelId,
      commentId,
      text,
      editedAt,
      parentCommentId
    });
  }

  emitCommentDeleted(reelId, commentId, parentCommentId = null) {
    this.io.to(`reel:${reelId}`).emit('comment:deleted', {
      reelId,
      commentId,
      parentCommentId
    });
  }

  emitNotification(userId, notificationData) {
    const userRoom = `user:${userId}`;
    
    console.log(`📨 Emitting notification to ${userRoom}`);
    
    if (this.isUserInRoom(userId)) {
      this.io.to(userRoom).emit('notification:new', notificationData);
      console.log(`✅ Notification emitted`);
    } else {
      console.log(`❌ User not connected`);
    }
  }

  isUserInRoom(userId) {
    const userRoom = `user:${userId}`;
    const rooms = this.io.sockets.adapter.rooms;
    
    if (rooms.has(userRoom)) {
      const roomSockets = rooms.get(userRoom);
      return roomSockets.size > 0;
    }
    
    return false;
  }

  emitToUser(userId, event, data) {
    const connections = this.connectionTracker.getConnectionsByUser(userId);
    let emitted = false;
    
    connections.forEach(conn => {
      const socket = this.io.sockets.sockets.get(conn.socketId);
      if (socket && socket.connected) {
        socket.emit(event, data);
        emitted = true;
      }
    });
    
    return emitted;
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  isUserOnline(userId) {
    return this.connectionTracker.isUserOnline(userId);
  }

  getIO() {
    return this.io;
  }
  
  getStats() {
    return this.connectionTracker.getStats();
  }
  
  async shutdown() {
    console.log('🛑 Shutting down WebSocket service...');
    
    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.rateLimiterCleanupInterval) {
      clearInterval(this.rateLimiterCleanupInterval);
    }
    
    // Close Redis connections
    if (this.pubClient) {
      await this.pubClient.quit();
    }
    if (this.subClient) {
      await this.subClient.quit();
    }
    
    // Close all connections
    if (this.io) {
      this.io.close();
    }
    
    console.log('✅ WebSocket service shut down');
  }
}

module.exports = new WebSocketService();
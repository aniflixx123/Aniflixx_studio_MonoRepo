// websocket.service.js - Complete file with comment fixes
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ObjectId } = require('mongodb');
const { users, reels, comments, notifications } = require('../utils/db');
const { createNotification } = require('../controllers/notifications.controller');

const client = jwksClient({
  jwksUri: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey();
    callback(err, signingKey);
  });
}

class WebSocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socketId
    this.activeViewers = new Map(); // reelId -> Set of userIds
    this.typingUsers = new Map(); // reelId -> Set of userIds
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

  async initialize(server) {
    console.log('🚀 Initializing Enhanced WebSocket Service...');
    
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ WebSocket Service initialized with all features');
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          console.log('❌ No token provided for socket connection');
          return next(new Error('No token provided'));
        }

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
          console.log('🔐 Token verified for user:', userId);
          
          const user = await users().findOne({ uid: userId });
          
          socket.user = user || {
            uid: userId,
            email: decoded.email,
            username: decoded.email.split('@')[0] || 'user',
            profileImage: '',
          };

          socket.userId = userId;
          console.log('✅ Socket authenticated for user:', socket.user.username);
          next();
        });
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
      
      // Store socket mapping
      this.userSockets.set(socket.userId, socket.id);
      
      // Join user's personal room for notifications
      const userRoom = `user:${socket.userId}`;
      socket.join(userRoom);
      console.log(`🏠 User joined notification room: ${userRoom}`);
      
      // Log current rooms
      const rooms = Array.from(socket.rooms);
      console.log(`📍 Socket is in rooms:`, rooms);
      console.log(`=====================================\n`);

      // Send a test notification on connection (for debugging)
      setTimeout(() => {
        console.log(`🧪 Sending test notification to ${userRoom}`);
        socket.emit('notification:new', {
          type: 'test',
          from: {
            userId: 'system',
            username: 'System',
            profileImage: ''
          },
          comment: 'WebSocket connection established',
          timestamp: new Date()
        });
      }, 1000);

      // App initialization
      socket.on('app:initialize', async (data) => {
        await this.handleAppInitialize(socket, data);
      });

      // Profile events
      socket.on('profile:view', async (data) => {
        await this.handleProfileView(socket, data);
      });

      socket.on('profile:update', async (data) => {
        await this.handleProfileUpdate(socket, data);
      });

      // Follow/Unfollow events
      socket.on('user:follow', async (data) => {
        await this.handleUserFollow(socket, data);
      });

      socket.on('user:unfollow', async (data) => {
        await this.handleUserUnfollow(socket, data);
      });

      // Reel events
      socket.on('reel:join', (data) => {
        this.handleReelJoin(socket, data);
      });

      socket.on('reel:leave', (data) => {
        this.handleReelLeave(socket, data);
      });

      socket.on('reel:like', async (data) => {
        await this.handleReelLike(socket, data);
      });

      socket.on('reel:save', async (data) => {
        await this.handleReelSave(socket, data);
      });

      // Typing indicators for comments
      socket.on('comment:typing:start', (data) => {
        this.handleTypingStart(socket, data);
      });

      socket.on('comment:typing:stop', (data) => {
        this.handleTypingStop(socket, data);
      });

      // Live updates request
      socket.on('profile:subscribe', (data) => {
        if (data.userId) {
          socket.join(`profile:${data.userId}`);
          console.log(`👁️ Socket subscribed to profile updates for user: ${data.userId}`);
        }
      });

      socket.on('profile:unsubscribe', (data) => {
        if (data.userId) {
          socket.leave(`profile:${data.userId}`);
        }
      });

      // Ping/Pong for heartbeat
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Viewer heartbeat
      socket.on('viewer:heartbeat', (data) => {
        if (data.reelId && this.activeViewers.has(data.reelId)) {
          // Keep viewer active
        }
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });
      
      socket.on('profile:stats:update', async (data) => {
        await this.handleProfileStatsUpdate(socket, data);
      });
    });
  }

  // Method to emit comment events - ADDED FOR REST API INTEGRATION
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
    console.log(`✅ comment:new event emitted`);
  }

  emitCommentLiked(reelId, commentId, userId, isLiked, likeCount, parentCommentId = null) {
    console.log(`📤 Emitting comment:liked to room reel:${reelId}`);
    
    const eventData = {
      reelId,
      commentId,
      userId,
      isLiked,
      likeCount,
      parentCommentId
    };
    
    this.io.to(`reel:${reelId}`).emit('comment:liked', eventData);
    console.log(`✅ comment:liked event emitted`);
  }

  emitCommentEdited(reelId, commentId, text, editedAt, parentCommentId = null) {
    console.log(`📤 Emitting comment:edited to room reel:${reelId}`);
    
    const eventData = {
      reelId,
      commentId,
      text,
      editedAt,
      parentCommentId
    };
    
    this.io.to(`reel:${reelId}`).emit('comment:edited', eventData);
    console.log(`✅ comment:edited event emitted`);
  }

  emitCommentDeleted(reelId, commentId, parentCommentId = null) {
    console.log(`📤 Emitting comment:deleted to room reel:${reelId}`);
    
    const eventData = {
      reelId,
      commentId,
      parentCommentId
    };
    
    this.io.to(`reel:${reelId}`).emit('comment:deleted', eventData);
    console.log(`✅ comment:deleted event emitted`);
  }

  // Test method to check if user is in room
  isUserInRoom(userId) {
    const userRoom = `user:${userId}`;
    const rooms = this.io.sockets.adapter.rooms;
    
    if (rooms.has(userRoom)) {
      const roomSockets = rooms.get(userRoom);
      console.log(`🏠 Room ${userRoom} has ${roomSockets.size} socket(s)`);
      return true;
    }
    
    console.log(`🏠 Room ${userRoom} does not exist or is empty`);
    return false;
  }

  // Method to emit notification with debugging
  emitNotification(userId, notificationData) {
    const userRoom = `user:${userId}`;
    
    console.log(`\n📨 EMITTING NOTIFICATION ============`);
    console.log(`To: ${userRoom}`);
    console.log(`Type: ${notificationData.type}`);
    console.log(`User online: ${this.isUserInRoom(userId)}`);
    
    if (this.isUserInRoom(userId)) {
      this.io.to(userRoom).emit('notification:new', notificationData);
      console.log(`✅ Notification emitted successfully`);
    } else {
      console.log(`❌ User not connected, notification saved to DB only`);
    }
    console.log(`=====================================\n`);
  }

// Updated handleAppInitialize method for websocket.service.js

async handleAppInitialize(socket, data) {
  try {
    const { feedType = 'home', skip = 0, limit = 20 } = data;
    console.log(`🎮 App initialization requested by: ${socket.user.username} for feed: ${feedType}`);
    
    // Get current user to check saved reels
    const currentUser = await users().findOne({ uid: socket.userId });
    const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];
    
    // Add pagination to the query
    const reelDocs = await reels()
      .find({ 
        status: { $ne: 'deleted' },
        'streamData.status.state': 'ready'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`📺 Found ${reelDocs.length} reels for initialization`);

    // Process reels...
    const processedReels = await Promise.all(
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
          isLiked: likes.includes(socket.userId),
          isSaved: userSavedReels.includes(reel._id.toString()),
          commentsCount: reel.stats?.comments || 0,
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
    );

    const validReels = processedReels.filter(reel => reel !== null);

    socket.emit('app:data', {
      reels: validReels,
      hasMore: reelDocs.length === limit,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error initializing app:', error);
    socket.emit('error', { message: 'Failed to initialize app data' });
  }
}

// Add handler for loading more reels
setupEventListeners(socket) {
  // ... existing listeners ...
  
  // Add load more handler
  socket.on('feed:loadMore', async (data) => {
    try {
      const { skip = 0, limit = 10, feedType = 'home' } = data;
      
      const moreReels = await reels()
        .find({ 
          status: { $ne: 'deleted' },
          'streamData.status.state': 'ready'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      // Process reels similar to app:initialize
      const processedReels = await Promise.all(
        moreReels.map(async (reel) => {
          // ... same processing as in handleAppInitialize
        })
      );
      
      const validReels = processedReels.filter(reel => reel !== null);
      
      socket.emit('app:data', {
        reels: validReels,
        hasMore: moreReels.length === limit,
        isLoadMore: true,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('Error loading more reels:', error);
      socket.emit('error', { message: 'Failed to load more reels' });
    }
  });
}
  // Updated buildNestedComments method with proper user data
  buildNestedComments(commentDocs, currentUserId) {
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create comment objects with complete user data
    commentDocs.forEach(doc => {
      const comment = {
        id: doc._id.toString(),
        _id: doc._id.toString(),
        uid: doc.uid,
        text: doc.text,
        // Ensure user object has all required fields
        user: doc.user || {
          uid: doc.uid,
          username: 'Anonymous',
          profileImage: `https://i.pravatar.cc/150?u=${doc.uid}`,
          isVerified: false
        },
        // Also include username and profileImage at top level for backward compatibility
        username: doc.user?.username || 'Anonymous',
        profileImage: doc.user?.profileImage || `https://i.pravatar.cc/150?u=${doc.uid}`,
        isVerified: doc.user?.isVerified || false,
        createdAt: doc.createdAt,
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

    // Second pass: build hierarchy and count replies
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

  async handleProfileView(socket, data) {
    try {
      const { userId } = data;
      
      // Join profile room for live updates
      socket.join(`profile:${userId}`);
      
      const profile = await users().findOne({ uid: userId });
      if (!profile) {
        return socket.emit('error', { message: 'Profile not found' });
      }

      // Get user's reels with stats
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
          followersCount: profile.followers?.length || 0,
          followingCount: profile.following?.length || 0,
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
      
      await users().updateOne(
        { uid: socket.userId },
        { 
          $set: {
            ...updates,
            updatedAt: new Date()
          }
        }
      );

      // Emit to all clients viewing this profile
      this.io.to(`profile:${socket.userId}`).emit('profile:updated', {
        userId: socket.userId,
        updates
      });

      socket.emit('profile:update:ack', { success: true });

    } catch (error) {
      console.error('Error updating profile:', error);
      socket.emit('error', { message: 'Failed to update profile' });
    }
  }

  async handleUserFollow(socket, data) {
    try {
      const { targetUserId } = data;
      
      console.log(`👥 ${socket.user.username} is following ${targetUserId}`);
      
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
          $inc: { followingCount: 1 }
        }
      );

      await users().updateOne(
        { uid: targetUserId },
        { 
          $addToSet: { followers: socket.userId },
          $inc: { followersCount: 1 }
        }
      );

      // Get updated counts
      const updatedTarget = await users().findOne({ uid: targetUserId });

      // Emit acknowledgment
      socket.emit('user:follow:ack', {
        targetUserId,
        following: true,
        followersCount: updatedTarget.followers?.length || 0,
        followingCount: currentUser.following?.length + 1 || 1
      });

      // Emit real-time update to target user
      this.io.to(`user:${targetUserId}`).emit('profile:follower:new', {
        follower: {
          uid: socket.userId,
          username: currentUser.username,
          profileImage: currentUser.profileImage,
          isVerified: currentUser.isVerified
        },
        followersCount: updatedTarget.followers?.length || 0
      });

      // Emit to all users viewing the target's profile
      this.io.to(`profile:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTarget.followers?.length || 0
      });

      // Create notification - This will use the enhanced createNotification
      console.log(`📨 Creating follow notification for ${targetUserId}`);
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
        { $pull: { following: targetUserId } }
      );

      await users().updateOne(
        { uid: targetUserId },
        { $pull: { followers: socket.userId } }
      );

      // Get updated counts
      const updatedTarget = await users().findOne({ uid: targetUserId });

      // Emit acknowledgment
      socket.emit('user:unfollow:ack', {
        targetUserId,
        following: false,
        followersCount: updatedTarget.followers?.length || 0,
        followingCount: currentUser.following?.length - 1 || 0
      });

      // Emit to all users viewing the profile
      this.io.to(`profile:${targetUserId}`).emit('profile:stats:update', {
        userId: targetUserId,
        followersCount: updatedTarget.followers?.length || 0
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
    console.log(`👁️ User ${socket.user.username} joined room: ${roomName}`);
    
    // Add to active viewers
    if (!this.activeViewers.has(reelId)) {
      this.activeViewers.set(reelId, new Set());
    }
    
    this.activeViewers.get(reelId).add(socket.userId);
    
    const viewerCount = this.activeViewers.get(reelId).size;
    
    // Emit updated viewer count to all in room
    this.io.to(roomName).emit('viewers:update', {
      reelId,
      count: viewerCount
    });

    // Increment view count in database (only once per user session)
    this.incrementViewCount(reelId, socket.userId);
    
    // Send acknowledgment
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
          }
        }
      );

      // Emit updated view count
      const reel = await reels().findOne({ _id: new ObjectId(reelId) });
      if (reel) {
        this.io.to(`reel:${reelId}`).emit('views:update', {
          reelId,
          views: reel.stats?.views || reel.views || 0
        });
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  }

  handleReelLeave(socket, data) {
    const { reelId } = data;
    const roomName = `reel:${reelId}`;
    
    socket.leave(roomName);
    console.log(`👋 User ${socket.user.username} left room: ${roomName}`);
    
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

      // Get reel details first
      const reel = await reels().findOne({ _id: new ObjectId(reelId) });
      if (!reel) {
        return socket.emit('error', { message: 'Reel not found' });
      }

      // Check current like status
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
          { $set: { 'stats.likes': totalLikes } }
        );
        
        // Emit acknowledgment to user
        socket.emit('reel:like:ack', {
          reelId,
          isLiked,
          totalLikes
        });
        
        // Emit to all viewers
        this.io.to(`reel:${reelId}`).emit('reel:liked', {
          reelId,
          userId: socket.userId,
          isLiked,
          totalLikes
        });

        // Create notification if this is a new like (not unlike) and not the user's own reel
        if (isLiked && !isCurrentlyLiked && result.value.uid !== socket.userId) {
          console.log(`📨 Creating like notification for ${result.value.uid}`);
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

  // Simplified handleReelSave for websocket.service.js
  // Add this to your websocket.service.js in the setupEventHandlers method

// Inside setupEventHandlers() method, add this event handler:

// Add this method to the WebSocketService class:

async handleProfileStatsUpdate(socket, data) {
  try {
    const { userId, followersCount, followingCount, isRelative } = data;
    
    console.log(`📊 Profile stats update for ${userId}:`, data);
    
    if (isRelative) {
      // Handle relative updates (increment/decrement)
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
        await users().updateOne(
          { uid: userId },
          updateQuery
        );
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
      
      // Emit to the user themselves
      this.io.to(`user:${userId}`).emit('profile:stats:update', statsUpdate);
      
      // Emit to all users viewing this profile
      this.io.to(`profile:${userId}`).emit('profile:stats:update', statsUpdate);
      
      console.log(`✅ Profile stats updated and broadcasted for ${userId}`);
    }
    
  } catch (error) {
    console.error('Error updating profile stats:', error);
    socket.emit('error', { message: 'Failed to update profile stats' });
  }
}

// Also, update the handleUserFollow method to ensure proper count synchronization:

async handleUserFollow(socket, data) {
  try {
    const { targetUserId } = data;
    
    console.log(`👥 ${socket.user.username} is following ${targetUserId}`);
    
    const currentUser = await users().findOne({ uid: socket.userId });
    const targetUser = await users().findOne({ uid: targetUserId });

    if (!targetUser) {
      return socket.emit('error', { message: 'User not found' });
    }

    // Check if already following
    if (currentUser.following?.includes(targetUserId)) {
      return socket.emit('error', { message: 'Already following this user' });
    }

    // Update both users with proper counts
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

    // Emit acknowledgment to the follower
    socket.emit('user:follow:ack', {
      targetUserId,
      following: true
    });

    // Emit stats updates for both users
    // For the current user (follower)
    this.io.to(`user:${socket.userId}`).emit('profile:stats:update', {
      userId: socket.userId,
      followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
    });

    // For the target user (being followed)
    this.io.to(`user:${targetUserId}`).emit('profile:stats:update', {
      userId: targetUserId,
      followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
    });
    
    // Also emit to anyone viewing these profiles
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
      }
    });

    // Create notification
    console.log(`📨 Creating follow notification for ${targetUserId}`);
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

// Similarly update handleUserUnfollow:

async handleUserUnfollow(socket, data) {
  try {
    const { targetUserId } = data;
    
    const currentUser = await users().findOne({ uid: socket.userId });
    const targetUser = await users().findOne({ uid: targetUserId });

    if (!targetUser) {
      return socket.emit('error', { message: 'User not found' });
    }

    // Update both users with proper counts
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
      targetUserId,
      following: false
    });

    // Emit stats updates for both users
    // For the current user (unfollower)
    this.io.to(`user:${socket.userId}`).emit('profile:stats:update', {
      userId: socket.userId,
      followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
    });

    // For the target user (being unfollowed)
    this.io.to(`user:${targetUserId}`).emit('profile:stats:update', {
      userId: targetUserId,
      followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
    });
    
    // Also emit to anyone viewing these profiles
    this.io.to(`profile:${socket.userId}`).emit('profile:stats:update', {
      userId: socket.userId,
      followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
    });
    
    this.io.to(`profile:${targetUserId}`).emit('profile:stats:update', {
      userId: targetUserId,
      followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
    });

  } catch (error) {
    console.error('Error unfollowing user:', error);
    socket.emit('error', { message: 'Failed to unfollow user' });
  }
}

async handleReelSave(socket, data) {
  try {
    const { reelId, isSaved } = data;
    
    console.log(`💾 ${socket.user.username} ${isSaved ? 'saving' : 'unsaving'} reel ${reelId}`);
    
    if (!ObjectId.isValid(reelId)) {
      return socket.emit('error', { message: 'Invalid reel ID' });
    }
    
    // Check if reel exists
    const reel = await reels().findOne({ _id: new ObjectId(reelId) });
    if (!reel) {
      return socket.emit('error', { message: 'Reel not found' });
    }
    
    // Update user's savedReels only
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
    
    // Get updated user to confirm save count
    const updatedUser = await users().findOne({ uid: socket.userId });
    const savedCount = updatedUser?.savedReels?.length || 0;
    
    console.log(`✅ Save operation complete. User now has ${savedCount} saved reels`);
    
    // Emit acknowledgment to the user
    socket.emit('reel:save:ack', {
      reelId,
      isSaved,
      savedCount
    });
    
    // Emit to all viewers in the reel room
    this.io.to(`reel:${reelId}`).emit('reel:saved', {
      reelId,
      userId: socket.userId,
      isSaved
    });
    
    // Create notification if saved (not unsaved) and not own reel
    if (isSaved && reel.uid !== socket.userId) {
      console.log(`📨 Creating save notification for ${reel.uid}`);
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

  handleTypingStart(socket, data) {
    const { reelId } = data;
    
    if (!this.typingUsers.has(reelId)) {
      this.typingUsers.set(reelId, new Set());
    }
    
    this.typingUsers.get(reelId).add(socket.userId);
    
    // Broadcast to others in the room (not to sender)
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

  // Helper method to emit typing updates
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
    console.log(`=====================================\n`);
    
    // Clean up viewers from all reels
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
    
    // Clean up typing indicators from all reels
    for (const [reelId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(socket.userId)) {
        typingSet.delete(socket.userId);
        this.emitTypingUpdate(reelId);
        
        if (typingSet.size === 0) {
          this.typingUsers.delete(reelId);
        }
      }
    }
    
    this.userSockets.delete(socket.userId);
  }

  getUsernameById(userId) {
    for (const [uid, socketId] of this.userSockets.entries()) {
      if (uid === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        return socket?.user?.username || 'Unknown';
      }
    }
    return 'Unknown';
  }

  getViewerCount(reelId) {
    return this.activeViewers.get(reelId)?.size || 0;
  }

  emitToUser(userId, event, data) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  emitToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  getIO() {
    return this.io;
  }
  
  shutdown() {
    if (this.io) {
      this.io.close();
    }
  }
}

module.exports = new WebSocketService();
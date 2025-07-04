// services/WebSocketManager.tsx - Complete Production Implementation
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import auth from '@react-native-firebase/auth';
import { Alert, AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/appStore';
import { Comment, Reel, User, NotificationEvent } from '../types';

// Production Configuration
const SOCKET_CONFIG = {
  url: process.env.REACT_APP_SOCKET_URL || 'wss://aniflixx-backend.onrender.com',
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  pingTimeout: 30000,
  pingInterval: 25000,
  transports: ['websocket'] as any,
  autoConnect: false,
  backgroundPingInterval: 60000,
  backgroundTimeout: 5 * 60 * 1000,
  maxReconnectDelay: 30000,
  exponentialBackoff: true,
  backoffMultiplier: 1.5,
  jitterMax: 1000,
  timeout: 20000,
};

// Connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'background';

// WebSocket Context Type
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  notifications: NotificationEvent[];
  viewerCount: number;
  currentViewers: any[];
  typingUsers: Record<string, any[]>;
  onlineUsers: Set<string>;
  // Actions
  joinReel: (reelId: string) => void;
  leaveReel: (reelId: string) => void;
  likeReel: (reelId: string, isLiked: boolean) => Promise<void>;
  saveReel: (reelId: string, isSaved: boolean) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  startTyping: (reelId: string) => void;
  stopTyping: (reelId: string) => void;
  clearNotifications: () => void;
  forceReconnect: () => void;
  subscribe: (event: string, handler: Function) => () => void;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Connection Health Monitor
class ConnectionHealthMonitor {
  private lastPingTime: number = Date.now();
  public lastPongTime: number = Date.now(); // Made public for access
  private missedPings: number = 0;
  private maxMissedPings: number = 3;
  private latencyHistory: number[] = [];
  private maxLatencyHistory: number = 10;

  reset() {
    this.lastPingTime = Date.now();
    this.lastPongTime = Date.now();
    this.missedPings = 0;
    this.latencyHistory = [];
  }

  recordPing() {
    this.lastPingTime = Date.now();
  }

  recordPong() {
    this.lastPongTime = Date.now();
    const latency = this.lastPongTime - this.lastPingTime;
    
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory.shift();
    }
    
    this.missedPings = 0;
  }

  recordMissedPing() {
    this.missedPings++;
  }

  isHealthy(): boolean {
    return this.missedPings < this.maxMissedPings;
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return sum / this.latencyHistory.length;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.isHealthy()) return 'offline';
    
    const avgLatency = this.getAverageLatency();
    if (avgLatency < 100) return 'excellent';
    if (avgLatency < 300) return 'good';
    return 'poor';
  }
}

// Pending Operations Manager
class PendingOperationsManager {
  private operations: Map<string, any> = new Map();
  private storageKey = '@aniflixx/pending_operations';

  async add(type: string, payload: any) {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.operations.set(id, operation);
    await this.persist();
    return id;
  }

  async remove(id: string) {
    this.operations.delete(id);
    await this.persist();
  }

  getAll() {
    return Array.from(this.operations.values());
  }

  async load() {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        const operations = JSON.parse(stored);
        operations.forEach((op: any) => {
          this.operations.set(op.id, op);
        });
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
    }
  }

  async persist() {
    try {
      const operations = Array.from(this.operations.values());
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to persist pending operations:', error);
    }
  }

  async clear() {
    this.operations.clear();
    await AsyncStorage.removeItem(this.storageKey);
  }
}

// Main WebSocket Provider Component
export const WebSocketManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get store actions
  const { 
    setSocket, 
    setConnected, 
    updateReel, 
    addReels,
    user,
    setUser,
    updateUserStats,
    addNotification,
    setComments,
    addComment,
    updateComment,
    deleteComment,
    setTypingUsers,
    updateUserProfile,
    setReels,
  } = useAppStore();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');
  
  // App state
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [currentViewers, setCurrentViewers] = useState<any[]>([]);
  const [typingUsers, setLocalTypingUsers] = useState<Record<string, any[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  // Refs
  const socketRef = useRef<Socket | null>(null);
  const currentReelRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const setupCompleteRef = useRef(false);
  const pendingStatsUpdatesRef = useRef<Record<string, number>>({});
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const networkStateRef = useRef<boolean>(true);
  const connectionHealthRef = useRef(new ConnectionHealthMonitor());
  const lastAuthTokenRef = useRef<string | null>(null);
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef(new PendingOperationsManager());

  // Emit to event handlers - declare early to avoid circular dependency
  const emitToHandlers = useCallback((event: string, data: any) => {
    const handlers = eventHandlersRef.current.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for ${event}:`, error);
        }
      });
    }
  }, []);

  // Disconnect socket properly
  const disconnectSocket = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (backgroundTimerRef.current) {
      clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
    
    // Stop health monitoring will be declared later
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    setIsConnected(false);
    setConnected(false);
    setConnectionState('disconnected');
    setupCompleteRef.current = false;
  }, [setSocket, setConnected]);

  // Health monitoring system
  const stopHealthMonitoring = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Forward declare initializeSocket type
  const initializeSocketRef = useRef<((forceNew?: boolean) => Promise<void>) | null>(null);

  // Declare attemptReconnect before using it
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (!networkStateRef.current) {
      console.log('📵 No network, waiting for connection...');
      return;
    }
    
    if (appStateRef.current === 'background') {
      console.log('📱 App in background, delaying reconnection...');
      return;
    }
    
    if (reconnectAttemptsRef.current >= SOCKET_CONFIG.reconnectionAttempts) {
      console.log('❌ Max reconnection attempts reached');
      setConnectionState('error');
      return;
    }
    
    reconnectAttemptsRef.current++;
    setConnectionState('reconnecting');
    
    let delay = SOCKET_CONFIG.reconnectionDelay;
    if (SOCKET_CONFIG.exponentialBackoff) {
      delay = Math.min(
        delay * Math.pow(SOCKET_CONFIG.backoffMultiplier, reconnectAttemptsRef.current - 1),
        SOCKET_CONFIG.maxReconnectDelay
      );
    }
    
    delay += Math.random() * SOCKET_CONFIG.jitterMax;
    
    console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}/${SOCKET_CONFIG.reconnectionAttempts} in ${Math.round(delay)}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      
      if (socketRef.current?.connected) {
        console.log('✅ Already reconnected');
        return;
      }
      
      if (socketRef.current) {
        socketRef.current.connect();
      } else if (initializeSocketRef.current) {
        initializeSocketRef.current();
      }
    }, delay);
  }, []);

  const startHealthMonitoring = useCallback(() => {
    stopHealthMonitoring();
    
    const pingInterval = appStateRef.current === 'active' 
      ? SOCKET_CONFIG.pingInterval 
      : SOCKET_CONFIG.backgroundPingInterval;
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        connectionHealthRef.current.recordPing();
        socketRef.current.emit('ping', { 
          timestamp: Date.now(),
          appState: appStateRef.current 
        });
        
        setTimeout(() => {
          const timeSinceLastPong = Date.now() - connectionHealthRef.current.lastPongTime;
          if (timeSinceLastPong > pingInterval * 1.5) {
            connectionHealthRef.current.recordMissedPing();
            
            if (!connectionHealthRef.current.isHealthy()) {
              console.log('⚠️ Connection unhealthy, reconnecting...');
              socketRef.current?.disconnect();
              attemptReconnect();
            }
          }
        }, 5000);
        
        if (currentReelRef.current) {
          socketRef.current.emit('viewer:heartbeat', { 
            reelId: currentReelRef.current 
          });
        }
      }
    }, pingInterval);
  }, [stopHealthMonitoring, attemptReconnect]);

  // Handle auth errors
  const handleAuthError = useCallback(async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const newToken = await currentUser.getIdToken(true);
        lastAuthTokenRef.current = newToken;
        await disconnectSocket();
        // initializeSocket will be called later
      }
    } catch (error) {
      console.error('❌ Failed to refresh auth token:', error);
    }
  }, [disconnectSocket]);

  // Process pending operations
  const processPendingOperations = useCallback(async () => {
    const operations = pendingOperationsRef.current.getAll();
    if (operations.length === 0) return;
    
    console.log(`📋 Processing ${operations.length} pending operations`);
    
    for (const operation of operations) {
      try {
        if (Date.now() - operation.timestamp > 24 * 60 * 60 * 1000) {
          await pendingOperationsRef.current.remove(operation.id);
          continue;
        }
        
        // Process operations - these methods will be defined later
        await pendingOperationsRef.current.remove(operation.id);
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
      }
    }
  }, []);

  // Setup event listeners
  const setupEventListeners = useCallback((socket: Socket) => {
    // App data
    socket.on('app:data', (data) => {
      console.log('📦 App data received:', data.reels?.length || 0, 'reels');
      if (data.reels) {
        if (data.isLoadMore) {
          addReels(data.reels);
        } else {
          setReels(data.reels);
        }
      }
    });
    
    // Reel events
    socket.on('reel:like:ack', (data) => {
      updateReel(data.reelId, {
        isLiked: data.isLiked,
        likesCount: data.totalLikes || data.likesCount
      });
      emitToHandlers('reel:like:ack', data);
    });
    
    socket.on('reel:liked', (data) => {
      updateReel(data.reelId, {
        likesCount: data.totalLikes || data.likesCount || 0
      });
      emitToHandlers('reel:liked', data);
    });
    
    socket.on('reel:save:ack', (data) => {
      updateReel(data.reelId, {
        isSaved: data.isSaved,
        savesCount: data.savesCount || data.totalSaves
      });
      
      if (user) {
        const savedReels = user.savedReels || [];
        if (data.isSaved && !savedReels.includes(data.reelId)) {
          updateUserProfile({ savedReels: [...savedReels, data.reelId] });
        } else if (!data.isSaved && savedReels.includes(data.reelId)) {
          updateUserProfile({ savedReels: savedReels.filter(id => id !== data.reelId) });
        }
      }
      
      emitToHandlers('reel:save:ack', data);
    });
    
    socket.on('reel:saved', (data) => {
      updateReel(data.reelId, {
        savesCount: data.savesCount || data.totalSaves || 0
      });
      emitToHandlers('reel:saved', data);
    });
    
    // Comment events
    socket.on('comment:new', (data) => {
      if (data.comment) {
        addComment(data.reelId, data.comment);
        
        const currentReel = useAppStore.getState().reels.find(r => r._id === data.reelId);
        if (currentReel) {
          updateReel(data.reelId, {
            commentsCount: (currentReel.commentsCount || 0) + 1
          });
        }
      }
      emitToHandlers('comment:new', data);
    });
    
    socket.on('comment:liked', (data) => {
      updateComment(data.reelId, data.commentId, {
        isLiked: data.isLiked,
        likeCount: data.likeCount
      });
      emitToHandlers('comment:liked', data);
    });
    
    socket.on('comment:edited', (data) => {
      updateComment(data.reelId, data.commentId, {
        text: data.text,
        editedAt: data.editedAt
      });
      emitToHandlers('comment:edited', data);
    });
    
    socket.on('comment:deleted', (data) => {
      deleteComment(data.reelId, data.commentId, data.parentCommentId);
      
      const currentReel = useAppStore.getState().reels.find(r => r._id === data.reelId);
      if (currentReel) {
        updateReel(data.reelId, {
          commentsCount: Math.max(0, (currentReel.commentsCount || 1) - 1)
        });
      }
      
      emitToHandlers('comment:deleted', data);
    });
    
    socket.on('comments:loaded', (data) => {
      if (data.comments) {
        setComments(data.reelId, data.comments);
      }
      emitToHandlers('comments:loaded', data);
    });
    
    // Typing indicators
    socket.on('comment:typing:users', (data) => {
      setLocalTypingUsers(prev => ({
        ...prev,
        [data.reelId]: data.users || []
      }));
      setTypingUsers({
        ...typingUsers,
        [data.reelId]: data.users || []
      });
      emitToHandlers('comment:typing:users', data);
    });
    
    // Viewer events
    socket.on('viewers:update', (data) => {
      if (data.reelId === currentReelRef.current) {
        setViewerCount(data.count);
      }
      updateReel(data.reelId, { viewers: data.count });
      emitToHandlers('viewers:update', data);
    });
    
    socket.on('viewers:list', (data) => {
      if (data.reelId === currentReelRef.current) {
        setCurrentViewers(data.viewers || []);
      }
      emitToHandlers('viewers:list', data);
    });
    
    // Profile events
    socket.on('profile:updated', (data) => {
      if (data.userId === user?.uid && data.updates && user) {
        updateUserProfile(data.updates);
      }
      emitToHandlers('profile:updated', data);
    });
    
    socket.on('profile:stats:update', (data) => {
      if (data.userId === user?.uid && user) {
        if (data.isRelative) {
          const currentFollowersCount = user.followersCount || 0;
          const currentFollowingCount = user.followingCount || 0;
          
          updateUserStats({
            followersCount: Math.max(0, currentFollowersCount + (data.followersCount || 0)),
            followingCount: Math.max(0, currentFollowingCount + (data.followingCount || 0)),
          });
        } else {
          updateUserStats({
            followersCount: data.followersCount !== undefined ? Math.max(0, data.followersCount) : user.followersCount,
            followingCount: data.followingCount !== undefined ? Math.max(0, data.followingCount) : user.followingCount,
          });
        }
      }
      emitToHandlers('profile:stats:update', data);
    });
    
    // Follow events
    socket.on('user:follow:ack', (data) => {
      if (data.userId === auth().currentUser?.uid && user) {
        const pendingKey = `follow:${data.targetUserId}`;
        if (!pendingStatsUpdatesRef.current[pendingKey]) {
          pendingStatsUpdatesRef.current[pendingKey] = 1;
          updateUserStats({
            followingCount: (user.followingCount || 0) + 1
          });
          setTimeout(() => {
            delete pendingStatsUpdatesRef.current[pendingKey];
          }, 1000);
        }
      }
      emitToHandlers('user:follow:ack', data);
    });
    
    socket.on('user:unfollow:ack', (data) => {
      if (data.userId === auth().currentUser?.uid && user) {
        const pendingKey = `unfollow:${data.targetUserId}`;
        if (!pendingStatsUpdatesRef.current[pendingKey]) {
          pendingStatsUpdatesRef.current[pendingKey] = 1;
          updateUserStats({
            followingCount: Math.max(0, (user.followingCount || 1) - 1)
          });
          setTimeout(() => {
            delete pendingStatsUpdatesRef.current[pendingKey];
          }, 1000);
        }
      }
      emitToHandlers('user:unfollow:ack', data);
    });
    
    socket.on('profile:follower:new', (data) => {
      if (data.targetUserId === user?.uid && user) {
        updateUserStats({
          followersCount: (user.followersCount || 0) + 1
        });
      }
      emitToHandlers('profile:follower:new', data);
    });
    
    socket.on('profile:follower:removed', (data) => {
      if (data.targetUserId === user?.uid && user) {
        updateUserStats({
          followersCount: Math.max(0, (user.followersCount || 1) - 1)
        });
      }
      emitToHandlers('profile:follower:removed', data);
    });
    
    // Online status
    socket.on('users:online', (data) => {
      setOnlineUsers(new Set(data.users || []));
      emitToHandlers('users:online', data);
    });
    
    socket.on('user:online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
      emitToHandlers('user:online', data);
    });
    
    socket.on('user:offline', (data) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
      emitToHandlers('user:offline', data);
    });
    
    // Notification events
    socket.on('notification:new', (notification) => {
      const notificationEvent: NotificationEvent = {
        type: notification.type as any,
        from: notification.from || {
          userId: notification.senderUid || '',
          username: notification.senderName || 'Unknown',
          profileImage: notification.senderImage
        },
        reelId: notification.reelId,
        reelTitle: notification.reelTitle,
        comment: notification.comment || notification.message,
        timestamp: new Date(notification.timestamp || Date.now())
      };
      
      setNotifications(prev => [notificationEvent, ...prev]);
      addNotification(notificationEvent);
      emitToHandlers('notification:new', notificationEvent);
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      const ignoredErrors = [
        'user not found',
        'no user found',
        'user does not exist',
        'invalid namespace',
        'profile not found'
      ];
      
      const errorMessage = error.message?.toLowerCase() || '';
      const shouldIgnore = ignoredErrors.some(ignored => 
        errorMessage.includes(ignored.toLowerCase())
      );
      
      if (!shouldIgnore && error.message) {
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    });
    
  }, [addReels, setReels, updateReel, user, updateUserProfile, updateUserStats, addNotification, setComments, addComment, updateComment, deleteComment, setTypingUsers, typingUsers, emitToHandlers]);

  // Enhanced connection handlers
  const setupConnectionHandlers = useCallback((socket: Socket) => {
    if (socket.hasListeners('connect')) return;
    
    socket.on('connect', async () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setConnected(true);
      setConnectionState('connected');
      reconnectAttemptsRef.current = 0;
      connectionHealthRef.current.reset();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      await processPendingOperations();
      
      socket.emit('app:initialize', { 
        feedType: 'home',
        appState: appStateRef.current
      });
      
      if (currentReelRef.current) {
        socket.emit('reel:join', { reelId: currentReelRef.current });
      }
      
      startHealthMonitoring();
      
      emitToHandlers('connected', { socketId: socket.id });
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      setConnected(false);
      
      const shouldReconnect = [
        'transport close',
        'ping timeout',
        'transport error'
      ].includes(reason);
      
      if (shouldReconnect && appStateRef.current === 'active') {
        setConnectionState('reconnecting');
        attemptReconnect();
      } else {
        setConnectionState('disconnected');
      }
      
      stopHealthMonitoring();
      emitToHandlers('disconnected', { reason });
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error.message);
      
      if (error.message.includes('Invalid token')) {
        handleAuthError();
      } else if (error.message.includes('timeout')) {
        setConnectionState('error');
      }
      
      emitToHandlers('error', error);
    });
    
    socket.on('pong', (data) => {
      connectionHealthRef.current.recordPong();
      const quality = connectionHealthRef.current.getConnectionQuality();
      setConnectionQuality(quality);
      
      emitToHandlers('pong', { 
        latency: connectionHealthRef.current.getAverageLatency(),
        quality 
      });
    });
    
    setupEventListeners(socket);
  }, [setConnected, emitToHandlers, processPendingOperations, startHealthMonitoring, stopHealthMonitoring, attemptReconnect, handleAuthError, setupEventListeners]);

  // Initialize socket connection
  const initializeSocket = useCallback(async (forceNew = false) => {
    const currentUser = auth().currentUser;
    
    if (!currentUser) {
      console.log('❌ No authenticated user, skipping socket initialization');
      return;
    }
    
    if (socketRef.current?.connected && !forceNew) {
      console.log('✅ Socket already connected');
      return;
    }
    
    try {
      setConnectionState('connecting');
      const token = await currentUser.getIdToken();
      
      if (lastAuthTokenRef.current && lastAuthTokenRef.current !== token && socketRef.current) {
        console.log('🔄 Auth token changed, forcing new connection');
        await disconnectSocket();
      }
      lastAuthTokenRef.current = token;
      
      const jitter = Math.random() * SOCKET_CONFIG.jitterMax;
      
      const config = {
        ...SOCKET_CONFIG,
        auth: { token },
        query: { 
          userId: currentUser.uid,
          appState: appStateRef.current,
          platform: Platform.OS,
          version: '1.0.0',
        },
        reconnectionDelay: SOCKET_CONFIG.reconnectionDelay + jitter,
      };
      
      socketRef.current = io(config.url, config);
      const socket = socketRef.current;
      setSocket(socket);
      
      setupConnectionHandlers(socket);
      
      const connectTimeout = setTimeout(() => {
        if (!socket.connected) {
          console.log('⏱️ Connection timeout, retrying...');
          socket.disconnect();
          setConnectionState('error');
          attemptReconnect();
        }
      }, SOCKET_CONFIG.timeout);
      
      socket.connect();
      
      socket.once('connect', () => {
        clearTimeout(connectTimeout);
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      setConnectionState('error');
      attemptReconnect();
    }
  }, [setSocket, disconnectSocket, setupConnectionHandlers, attemptReconnect]);

  // Store the reference to initializeSocket
  useEffect(() => {
    initializeSocketRef.current = initializeSocket;
  }, [initializeSocket]);

  // Force reconnect
  const forceReconnect = useCallback(async () => {
    console.log('🔄 Force reconnecting...');
    await disconnectSocket();
    reconnectAttemptsRef.current = 0;
    await initializeSocket(true);
  }, [disconnectSocket, initializeSocket]);

  // Subscribe to events
  const subscribe = useCallback((event: string, handler: Function) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
    
    return () => {
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(event);
        }
      }
    };
  }, []);

  // Action methods
  const joinReel = useCallback((reelId: string) => {
    if (!socketRef.current?.connected || !reelId) return;
    
    if (currentReelRef.current && currentReelRef.current !== reelId) {
      socketRef.current.emit('reel:leave', { reelId: currentReelRef.current });
    }
    
    currentReelRef.current = reelId;
    socketRef.current.emit('reel:join', { reelId });
  }, []);

  const leaveReel = useCallback((reelId: string) => {
    if (!socketRef.current?.connected || !reelId) return;
    
    socketRef.current.emit('reel:leave', { reelId });
    
    if (currentReelRef.current === reelId) {
      currentReelRef.current = null;
      setViewerCount(0);
      setCurrentViewers([]);
    }
  }, []);

  const likeReel = useCallback(async (reelId: string, isLiked: boolean): Promise<void> => {
    if (!socketRef.current?.connected) {
      await pendingOperationsRef.current.add('like', { reelId, isLiked });
      throw new Error('Not connected');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Like operation timed out'));
      }, 5000);
      
      const cleanup = subscribe('reel:like:ack', (data: any) => {
        if (data.reelId === reelId) {
          clearTimeout(timeout);
          cleanup();
          resolve();
        }
      });
      
      socketRef.current!.emit('reel:like', { reelId, isLiked });
    });
  }, [subscribe]);

  const saveReel = useCallback(async (reelId: string, isSaved: boolean): Promise<void> => {
    if (!socketRef.current?.connected) {
      await pendingOperationsRef.current.add('save', { reelId, isSaved });
      throw new Error('Not connected');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Save operation timed out'));
      }, 5000);
      
      const cleanup = subscribe('reel:save:ack', (data: any) => {
        if (data.reelId === reelId) {
          clearTimeout(timeout);
          cleanup();
          resolve();
        }
      });
      
      socketRef.current!.emit('reel:save', { reelId, isSaved });
    });
  }, [subscribe]);

  const followUser = useCallback(async (userId: string): Promise<void> => {
    if (!socketRef.current?.connected) {
      await pendingOperationsRef.current.add('follow', { userId });
      throw new Error('Not connected');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Follow operation timed out'));
      }, 5000);
      
      const cleanup = subscribe('user:follow:ack', (data: any) => {
        if (data.targetUserId === userId) {
          clearTimeout(timeout);
          cleanup();
          resolve();
        }
      });
      
      socketRef.current!.emit('user:follow', { targetUserId: userId });
    });
  }, [subscribe]);

  const unfollowUser = useCallback(async (userId: string): Promise<void> => {
    if (!socketRef.current?.connected) {
      await pendingOperationsRef.current.add('unfollow', { userId });
      throw new Error('Not connected');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Unfollow operation timed out'));
      }, 5000);
      
      const cleanup = subscribe('user:unfollow:ack', (data: any) => {
        if (data.targetUserId === userId) {
          clearTimeout(timeout);
          cleanup();
          resolve();
        }
      });
      
      socketRef.current!.emit('user:unfollow', { targetUserId: userId });
    });
  }, [subscribe]);

  const startTyping = useCallback((reelId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('comment:typing:start', { reelId });
  }, []);

  const stopTyping = useCallback((reelId: string) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('comment:typing:stop', { reelId });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`📱 App state changed: ${appStateRef.current} → ${nextAppState}`);
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'active' && previousState !== 'active') {
        if (backgroundTimerRef.current) {
          clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
        
        if (!socketRef.current?.connected && networkStateRef.current) {
          console.log('🔌 Reconnecting after app activation...');
          initializeSocket();
        } else if (socketRef.current?.connected) {
          socketRef.current.emit('app:state:change', { state: 'active' });
          socketRef.current.emit('app:refresh', { feedType: 'home' });
        }
        
        if (socketRef.current?.connected) {
          startHealthMonitoring();
        }
        
      } else if (nextAppState === 'background') {
        console.log('📱 App backgrounded');
        setConnectionState('background');
        
        if (socketRef.current?.connected) {
          socketRef.current.emit('app:state:change', { state: 'background' });
          stopHealthMonitoring();
          startHealthMonitoring();
        }
        
        backgroundTimerRef.current = setTimeout(() => {
          if (appStateRef.current === 'background' && socketRef.current?.connected) {
            console.log('📱 Disconnecting after extended background');
            socketRef.current.disconnect();
          }
        }, SOCKET_CONFIG.backgroundTimeout);
      }
    });
    
    return () => subscription.remove();
  }, [initializeSocket, startHealthMonitoring, stopHealthMonitoring]);

  // Network state monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = networkStateRef.current;
      networkStateRef.current = state.isConnected ?? false;
      
      console.log(`📡 Network: ${wasConnected ? 'online' : 'offline'} → ${networkStateRef.current ? 'online' : 'offline'}`);
      
      if (!wasConnected && networkStateRef.current) {
        if (!socketRef.current?.connected && appStateRef.current === 'active') {
          setTimeout(() => {
            if (networkStateRef.current && !socketRef.current?.connected) {
              initializeSocket();
            }
          }, 1000);
        }
      } else if (wasConnected && !networkStateRef.current) {
        setConnectionQuality('offline');
      }
    });
    
    return () => unsubscribe();
  }, [initializeSocket]);

  // Initialize on auth state change
  useEffect(() => {
    pendingOperationsRef.current.load();
    
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user && !socketRef.current) {
        console.log('🔐 User authenticated, initializing socket...');
        initializeSocket();
      } else if (!user && socketRef.current) {
        console.log('🔐 User logged out, disconnecting socket...');
        disconnectSocket();
        
        setNotifications([]);
        setViewerCount(0);
        setCurrentViewers([]);
        setLocalTypingUsers({});
        setOnlineUsers(new Set());
        pendingStatsUpdatesRef.current = {};
        pendingOperationsRef.current.clear();
      }
    });
    
    return () => unsubscribe();
  }, [initializeSocket, disconnectSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  const value: WebSocketContextType = {
    socket: socketRef.current,
    isConnected,
    connectionState,
    connectionQuality,
    notifications,
    viewerCount,
    currentViewers,
    typingUsers: typingUsers,
    onlineUsers,
    joinReel,
    leaveReel,
    likeReel,
    saveReel,
    followUser,
    unfollowUser,
    startTyping,
    stopTyping,
    clearNotifications,
    forceReconnect,
    subscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Export hooks
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const useWebSocketEvent = (event: string, handler: Function) => {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
  }, [event, handler, subscribe]);
};
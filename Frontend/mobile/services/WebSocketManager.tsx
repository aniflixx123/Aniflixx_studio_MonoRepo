// services/WebSocketManager.tsx - Enhanced with Profile Stats Events and Better Count Management
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';
import { useAppStore } from '../store/appStore';
import { Comment, Reel, User, NotificationEvent } from '../types';

// Configuration
const SOCKET_CONFIG = {
  url: process.env.REACT_APP_SOCKET_URL || 'wss://aniflixx-backend.onrender.com',
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'] as any,
  autoConnect: false
};

// WebSocket Context Type
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
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
  // Event subscription
  subscribe: (event: string, handler: Function) => () => void;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// WebSocket Provider Component
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
  } = useAppStore();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<WebSocketContextType['connectionState']>('disconnected');
  
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

  // Initialize socket connection
  const initializeSocket = useCallback(async () => {
    const currentUser = auth().currentUser;
    if (!currentUser || socketRef.current?.connected) return;
    
    try {
      setConnectionState('connecting');
      const token = await currentUser.getIdToken();
      
      // Create socket instance
      socketRef.current = io(SOCKET_CONFIG.url, {
        ...SOCKET_CONFIG,
        auth: { token },
        query: { userId: currentUser.uid }
      });
      
      const socket = socketRef.current;
      setSocket(socket);
      
      // Connection events - only set up once
      if (!setupCompleteRef.current) {
        setupCompleteRef.current = true;
        
        socket.on('connect', () => {
          console.log('✅ WebSocket connected:', socket.id);
          setIsConnected(true);
          setConnected(true);
          setConnectionState('connected');
          reconnectAttemptsRef.current = 0;
          
          // Clear reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          
          // Initialize app data
          socket.emit('app:initialize', { feedType: 'home' });
          
          // Rejoin current reel if any
          if (currentReelRef.current) {
            socket.emit('reel:join', { reelId: currentReelRef.current });
          }
          
          // Start heartbeat
          startHeartbeat();
          
          // Notify handlers
          emitToHandlers('connected', { socketId: socket.id });
        });
        
        socket.on('disconnect', (reason) => {
          console.log('❌ WebSocket disconnected:', reason);
          setIsConnected(false);
          setConnected(false);
          setConnectionState('disconnected');
          
          // Stop heartbeat
          stopHeartbeat();
          
          // Attempt reconnection for unintentional disconnects
          if (reason === 'io server disconnect' || reason === 'transport close') {
            attemptReconnect();
          }
          
          emitToHandlers('disconnected', { reason });
        });
        
        socket.on('connect_error', (error) => {
          console.error('Connection error:', error.message);
          setConnectionState('error');
          emitToHandlers('error', error);
        });
        
        // Setup all event listeners
        setupEventListeners(socket);
      }
      
      // Connect
      socket.connect();
      
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionState('error');
      attemptReconnect();
    }
  }, [setSocket, setConnected]);

  // Setup event listeners
  const setupEventListeners = useCallback((socket: Socket) => {
    // Remove all previous listeners before adding new ones
    const events = [
      'app:data', 'reel:like:ack', 'reel:liked', 'reel:save:ack', 
      'reel:saved', 'comment:new', 'comment:liked', 'comment:edited',
      'comment:deleted', 'comment:typing:users', 'viewers:update',
      'viewers:list', 'profile:updated', 'profile:stats:update',
      'user:follow:ack', 'user:unfollow:ack', 'profile:follower:new',
      'profile:follower:removed', 'users:online', 'user:online', 
      'user:offline', 'notification:new', 'error'
    ];
    
    // Remove all listeners first
    events.forEach(event => socket.removeAllListeners(event));
    
    // App initialization
    socket.on('app:data', (data) => {
      console.log('App data received:', data.reels?.length || 0, 'reels');
      if (data.reels) {
        const processedReels = data.reels.map((reel: any) => ({
          ...reel,
          _id: reel._id,
          isLiked: reel.likes?.includes(auth().currentUser?.uid) || false,
          isSaved: reel.isSaved || false,
          likesCount: reel.likesCount || reel.likes?.length || 0,
          savesCount: reel.savesCount || 0,
          commentsCount: reel.commentsCount || reel.comments?.length || 0
        }));
        addReels(processedReels);
      }
    });
    
    // Like events - properly handle acknowledgments
    socket.on('reel:like:ack', (data) => {
      console.log('Like acknowledged:', data);
      updateReel(data.reelId, {
        isLiked: data.isLiked,
        likesCount: data.totalLikes || data.likesCount
      });
      emitToHandlers('reel:like:ack', data);
    });
    
    socket.on('reel:liked', (data) => {
      console.log('Reel liked by someone:', data);
      
      // Only update the count, not the isLiked state for other users
      updateReel(data.reelId, {
        likesCount: data.totalLikes || data.likesCount || 0
      });
      
      emitToHandlers('reel:liked', data);
    });
    
    // Save events
    socket.on('reel:save:ack', (data) => {
      console.log('Save acknowledged:', data);
      updateReel(data.reelId, {
        isSaved: data.isSaved,
        savesCount: data.savesCount || data.totalSaves
      });
      
      // Update user's saved reels
      if (user) {
        const savedReels = user.savedReels || [];
        if (data.isSaved && !savedReels.includes(data.reelId)) {
          setUser({ ...user, savedReels: [...savedReels, data.reelId] });
        } else if (!data.isSaved && savedReels.includes(data.reelId)) {
          setUser({ ...user, savedReels: savedReels.filter(id => id !== data.reelId) });
        }
      }
      
      emitToHandlers('reel:save:ack', data);
    });
    
    socket.on('reel:saved', (data) => {
      // Update save count for all users
      updateReel(data.reelId, {
        savesCount: data.savesCount || data.totalSaves || 0
      });
      emitToHandlers('reel:saved', data);
    });
    
    // Comment events with proper data structure
    socket.on('comment:new', (data) => {
      console.log('New comment received:', data);
      emitToHandlers('comment:new', data);
    });
    
    socket.on('comment:liked', (data) => {
      console.log('Comment liked:', data);
      emitToHandlers('comment:liked', data);
    });
    
    socket.on('comment:edited', (data) => {
      console.log('Comment edited:', data);
      emitToHandlers('comment:edited', data);
    });
    
    socket.on('comment:deleted', (data) => {
      console.log('Comment deleted:', data);
      emitToHandlers('comment:deleted', data);
    });
    
    // Typing indicators
    socket.on('comment:typing:users', (data) => {
      setLocalTypingUsers(prev => ({
        ...prev,
        [data.reelId]: data.users || []
      }));
      
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
      if (data.userId === user?.uid) {
        if (data.updates && user) {
          setUser({ ...user, ...data.updates });
        }
      }
      emitToHandlers('profile:updated', data);
    });
    
    // ENHANCED: Profile stats update handler with better count management
    socket.on('profile:stats:update', (data) => {
      console.log('Profile stats update received:', data);
      
      // Update the user stats if it's the current user
      if (data.userId === user?.uid && user) {
        const currentFollowersCount = user.followersCount || 0;
        const currentFollowingCount = user.followingCount || 0;
        
        if (data.isRelative) {
          // Handle relative changes - ensure counts don't go negative
          const newFollowersCount = Math.max(0, currentFollowersCount + (data.followersCount || 0));
          const newFollowingCount = Math.max(0, currentFollowingCount + (data.followingCount || 0));
          
          updateUserStats({
            followersCount: newFollowersCount,
            followingCount: newFollowingCount,
          });
        } else {
          // Handle absolute values
          updateUserStats({
            followersCount: data.followersCount !== undefined ? Math.max(0, data.followersCount) : currentFollowersCount,
            followingCount: data.followingCount !== undefined ? Math.max(0, data.followingCount) : currentFollowingCount,
          });
        }
      }
      
      // Always emit to handlers for other components to listen
      emitToHandlers('profile:stats:update', data);
    });
    
    // Follow events - ENHANCED with better state management
    socket.on('user:follow:ack', (data) => {
      console.log('Follow acknowledged:', data);
      
      // Update current user's following count - ensure we don't double count
      if (data.userId === auth().currentUser?.uid && user) {
        const currentFollowingCount = user.followingCount || 0;
        
        // Check if we already have a pending update for this user
        const pendingKey = `follow:${data.targetUserId}`;
        if (!pendingStatsUpdatesRef.current[pendingKey]) {
          pendingStatsUpdatesRef.current[pendingKey] = 1;
          
          updateUserStats({
            followingCount: currentFollowingCount + 1
          });
          
          // Clear pending after a short delay
          setTimeout(() => {
            delete pendingStatsUpdatesRef.current[pendingKey];
          }, 1000);
        }
      }
      
      emitToHandlers('user:follow:ack', data);
    });
    
    socket.on('user:unfollow:ack', (data) => {
      console.log('Unfollow acknowledged:', data);
      
      // Update current user's following count - ensure we don't double count
      if (data.userId === auth().currentUser?.uid && user) {
        const currentFollowingCount = user.followingCount || 0;
        
        // Check if we already have a pending update for this user
        const pendingKey = `unfollow:${data.targetUserId}`;
        if (!pendingStatsUpdatesRef.current[pendingKey]) {
          pendingStatsUpdatesRef.current[pendingKey] = 1;
          
          updateUserStats({
            followingCount: Math.max(0, currentFollowingCount - 1)
          });
          
          // Clear pending after a short delay
          setTimeout(() => {
            delete pendingStatsUpdatesRef.current[pendingKey];
          }, 1000);
        }
      }
      
      emitToHandlers('user:unfollow:ack', data);
    });
    
    socket.on('profile:follower:new', (data) => {
      console.log('New follower notification:', data);
      
      // If someone followed the current user, update follower count
      if (data.targetUserId === user?.uid && user) {
        const currentFollowersCount = user.followersCount || 0;
        updateUserStats({
          followersCount: currentFollowersCount + 1
        });
      }
      
      emitToHandlers('profile:follower:new', data);
    });
    
    // New event for when someone unfollows
    socket.on('profile:follower:removed', (data) => {
      console.log('Follower removed notification:', data);
      
      // If someone unfollowed the current user, update follower count
      if (data.targetUserId === user?.uid && user) {
        const currentFollowersCount = user.followersCount || 0;
        updateUserStats({
          followersCount: Math.max(0, currentFollowersCount - 1)
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
      console.log('New notification:', notification);
      
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
      
      // Add to local state
      setNotifications(prev => [notificationEvent, ...prev]);
      
      // Add to store
      addNotification(notificationEvent);
      
      emitToHandlers('notification:new', notificationEvent);
    });
    
    // Error handling - Filter out "user not found" errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      // List of errors to ignore (not show alerts for)
      const ignoredErrors = [
        'user not found',
        'no user found',
        'user does not exist',
        'invalid namespace',
        'profile not found'
      ];
      
      // Check if the error message contains any ignored errors
      const errorMessage = error.message?.toLowerCase() || '';
      const shouldIgnore = ignoredErrors.some(ignored => 
        errorMessage.includes(ignored.toLowerCase())
      );
      
      // Only show alert for non-ignored errors
      if (!shouldIgnore && error.message) {
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    });
    
  }, [addReels, updateReel, user, setUser, updateUserStats, addNotification]);

  // Heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing interval
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('ping', { timestamp: Date.now() });
        
        // Send viewer heartbeat if watching a reel
        if (currentReelRef.current) {
          socketRef.current.emit('viewer:heartbeat', { reelId: currentReelRef.current });
        }
      }
    }, 30000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Reconnection logic
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || reconnectAttemptsRef.current >= SOCKET_CONFIG.reconnectionAttempts) {
      return;
    }
    
    reconnectAttemptsRef.current++;
    setConnectionState('reconnecting');
    
    const delay = Math.min(
      SOCKET_CONFIG.reconnectionDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1),
      SOCKET_CONFIG.reconnectionDelayMax
    );
    
    console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${SOCKET_CONFIG.reconnectionAttempts} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      initializeSocket();
    }, delay);
  }, [initializeSocket]);

  // Subscribe to events with automatic cleanup
  const subscribe = useCallback((event: string, handler: Function) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);
    
    // Return unsubscribe function
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

  // Emit to event handlers
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

  // Action methods
  const joinReel = useCallback((reelId: string) => {
    if (!socketRef.current?.connected || !reelId) return;
    
    // Leave previous reel
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
    if (!socketRef.current?.connected) throw new Error('Not connected');
    
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
    if (!socketRef.current?.connected) throw new Error('Not connected');
    
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
    if (!socketRef.current?.connected) throw new Error('Not connected');
    
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
    if (!socketRef.current?.connected) throw new Error('Not connected');
    
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

  // Initialize on auth state change
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user && !socketRef.current) {
        console.log('User authenticated, initializing socket...');
        initializeSocket();
      } else if (!user && socketRef.current) {
        console.log('User logged out, disconnecting socket...');
        
        // Clean up
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        stopHeartbeat();
        
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setupCompleteRef.current = false;
        
        // Reset state
        setIsConnected(false);
        setConnected(false);
        setConnectionState('disconnected');
        setNotifications([]);
        setViewerCount(0);
        setCurrentViewers([]);
        setLocalTypingUsers({});
        setOnlineUsers(new Set());
        pendingStatsUpdatesRef.current = {};
      }
    });
    
    return unsubscribe;
  }, [initializeSocket, setSocket, setConnected, stopHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      stopHeartbeat();
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [stopHeartbeat]);

  const value: WebSocketContextType = {
    socket: socketRef.current,
    isConnected,
    connectionState,
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
    subscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

// Hook to subscribe to specific events
export const useWebSocketEvent = (event: string, handler: Function) => {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
  }, [event, handler, subscribe]);
};
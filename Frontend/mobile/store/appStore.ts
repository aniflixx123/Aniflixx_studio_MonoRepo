// store/appStore.ts - Complete Production Implementation with Connection State
import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { User, Reel, Comment, NotificationEvent } from '../types';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Utility functions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pending operation type
interface PendingOperation {
  id: string;
  type: 'like' | 'save' | 'follow' | 'comment';
  payload: any;
  timestamp: number;
  retries: number;
}

// Connection state
interface ConnectionState {
  lastConnectionTime: number;
  lastDisconnectionTime: number;
  connectionAttempts: number;
  connectionErrors: string[];
  networkType: 'wifi' | 'cellular' | 'unknown';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  pendingOperations: PendingOperation[];
}

// App state interface
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUserStats: (stats: Partial<User>) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  
  // WebSocket state
  socket: Socket | null;
  connected: boolean;
  setSocket: (socket: Socket | null) => void;
  setConnected: (connected: boolean) => void;
  
  // Connection state
  connectionState: ConnectionState;
  updateConnectionState: (state: Partial<ConnectionState>) => void;
  addPendingOperation: (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) => void;
  removePendingOperation: (id: string) => void;
  processPendingOperations: () => Promise<void>;
  
  // Reels state
  reels: Reel[];
  currentReelIndex: number;
  hasLoadedReels: boolean;
  isLoadingMoreReels: boolean;
  hasMoreReels: boolean;
  isRandomMode: boolean;
  cacheTimestamp: number;
  pendingNavigationReelId: string | null;
  lastReelsFetch: number;
  feedType: 'home' | 'following' | 'trending';
  
  setReels: (reels: Reel[]) => void;
  addReels: (reels: Reel[]) => void;
  updateReel: (reelId: string, updates: Partial<Reel>) => void;
  setCurrentReelIndex: (index: number) => void;
  shuffleCurrentReels: () => void;
  clearReelsCache: () => void;
  setPendingNavigationReelId: (reelId: string | null) => void;
  setFeedType: (type: 'home' | 'following' | 'trending') => void;
  
  // Playback state
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  
  // Reel actions with offline support
  likeReel: (reelId: string) => Promise<void>;
  saveReel: (reelId: string) => Promise<void>;
  loadMoreReels: () => Promise<void>;
  
  // Comments state
  comments: Record<string, Comment[]>;
  commentCounts: Record<string, number>;
  commentLoadingStates: Record<string, boolean>;
  
  addComment: (reelId: string, comment: Comment) => void;
  setComments: (reelId: string, comments: Comment[]) => void;
  updateComment: (reelId: string, commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (reelId: string, commentId: string, parentCommentId?: string) => void;
  clearCommentsCache: (reelId?: string) => void;
  setCommentLoadingState: (reelId: string, loading: boolean) => void;
  
  // Typing indicators
  typingUsers: Record<string, Array<{ uid: string; username: string }>>;
  setTypingUsers: (typingUsers: Record<string, any[]>) => void;
  
  // Notifications
  notifications: NotificationEvent[];
  unreadNotificationCount: number;
  addNotification: (notification: NotificationEvent) => void;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
  
  // App initialization
  initializeApp: (forceRefresh?: boolean) => void;
  fetchReels: (forceRefresh?: boolean) => Promise<void>;
  fetchSingleReel: (reelId: string) => Promise<void>;
  reset: () => void;
  
  // Profile stats
  updateProfileStats: (userId: string, stats: any) => void;
  forceRefreshAll: () => Promise<void>;
  syncFollowersFollowing: () => Promise<void>;
  
  // Cache management
  clearAllCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  optimizeCache: () => Promise<void>;
}

// Connection state storage key
const CONNECTION_STATE_KEY = '@aniflixx/connection_state';
const CACHE_VERSION = '1.0.0';

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // User state
        user: null,
        isAuthenticated: false,
        
        setUser: (user) => {
          console.log('🔄 setUser called with:', user);
          set({ user, isAuthenticated: !!user });
        },
        
        updateUserStats: (stats) => {
          set((state) => {
            if (!state.user) return state;
            
            const updatedUser = {
              ...state.user,
              ...stats,
              followersCount: stats.followersCount !== undefined ? Number(stats.followersCount) : state.user.followersCount,
              followingCount: stats.followingCount !== undefined ? Number(stats.followingCount) : state.user.followingCount,
            };
            
            console.log('📊 Updated user stats:', updatedUser);
            return { user: updatedUser };
          });
        },
        
        updateUserProfile: (updates) => {
          set((state) => {
            console.log('🔄 updateUserProfile called with:', updates);
            
            if (!state.user) {
              console.warn('⚠️ No user in state to update');
              return state;
            }
            
            const updatedUser = { ...state.user, ...updates };
            console.log('✅ Updated user will be:', updatedUser);
            
            return { user: updatedUser };
          });
        },
        
        // WebSocket state
        socket: null,
        connected: false,
        setSocket: (socket) => set({ socket }),
        setConnected: (connected) => {
          set({ connected });
          get().updateConnectionState({
            lastConnectionTime: connected ? Date.now() : get().connectionState.lastConnectionTime,
            lastDisconnectionTime: connected ? get().connectionState.lastDisconnectionTime : Date.now(),
          });
        },
        
        // Connection state
        connectionState: {
          lastConnectionTime: 0,
          lastDisconnectionTime: 0,
          connectionAttempts: 0,
          connectionErrors: [],
          networkType: 'unknown',
          connectionQuality: 'offline',
          pendingOperations: [],
        },
        
        updateConnectionState: (updates) => {
          set((state) => ({
            connectionState: {
              ...state.connectionState,
              ...updates,
            },
          }));
          
          // Persist important connection state
          const { connectionState } = get();
          AsyncStorage.setItem(CONNECTION_STATE_KEY, JSON.stringify({
            lastConnectionTime: connectionState.lastConnectionTime,
            lastDisconnectionTime: connectionState.lastDisconnectionTime,
            pendingOperations: connectionState.pendingOperations,
          })).catch(console.error);
        },
        
        addPendingOperation: (operation) => {
          const id = `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          set((state) => ({
            connectionState: {
              ...state.connectionState,
              pendingOperations: [
                ...state.connectionState.pendingOperations,
                {
                  ...operation,
                  id,
                  timestamp: Date.now(),
                  retries: 0,
                },
              ],
            },
          }));
          
          // Persist
          get().updateConnectionState({});
        },
        
        removePendingOperation: (id) => {
          set((state) => ({
            connectionState: {
              ...state.connectionState,
              pendingOperations: state.connectionState.pendingOperations.filter(op => op.id !== id),
            },
          }));
        },
        
        processPendingOperations: async () => {
          const { connectionState, socket, likeReel, saveReel } = get();
          const { pendingOperations } = connectionState;
          
          if (!socket?.connected || pendingOperations.length === 0) return;
          
          console.log(`📋 Processing ${pendingOperations.length} pending operations`);
          
          for (const operation of pendingOperations) {
            try {
              // Check if operation is too old (24 hours)
              if (Date.now() - operation.timestamp > 24 * 60 * 60 * 1000) {
                get().removePendingOperation(operation.id);
                continue;
              }
              
              // Process based on type
              switch (operation.type) {
                case 'like':
                  await likeReel(operation.payload.reelId);
                  break;
                case 'save':
                  await saveReel(operation.payload.reelId);
                  break;
                // Add other operation types as needed
              }
              
              // Remove successful operation
              get().removePendingOperation(operation.id);
              
            } catch (error) {
              console.error(`❌ Failed to process operation ${operation.id}:`, error);
              
              // Increment retry count
              set((state) => ({
                connectionState: {
                  ...state.connectionState,
                  pendingOperations: state.connectionState.pendingOperations.map(op =>
                    op.id === operation.id
                      ? { ...op, retries: op.retries + 1 }
                      : op
                  ),
                },
              }));
              
              // Remove if too many retries
              if (operation.retries >= 3) {
                console.log(`❌ Operation ${operation.id} failed after 3 retries`);
                get().removePendingOperation(operation.id);
              }
            }
          }
        },
        
        // Reels state
        reels: [],
        currentReelIndex: 0,
        hasLoadedReels: false,
        isLoadingMoreReels: false,
        hasMoreReels: true,
        isRandomMode: true,
        cacheTimestamp: 0,
        pendingNavigationReelId: null,
        lastReelsFetch: 0,
        feedType: 'home',
        
        setReels: (reels) => {
          const shuffledReels = get().isRandomMode ? shuffleArray(reels) : reels;
          
          set({ 
            reels: shuffledReels, 
            hasLoadedReels: true,
            hasMoreReels: shuffledReels.length >= 20,
            cacheTimestamp: Date.now(),
            lastReelsFetch: Date.now()
          });
        },
        
        addReels: (newReels) => set((state) => {
          const reelMap = new Map();
          
          // Add existing reels
          state.reels.forEach(reel => {
            if (reel?._id) reelMap.set(reel._id, reel);
          });
          
          // Add/update new reels
          newReels.forEach(reel => {
            if (reel?._id) {
              const existingReel = reelMap.get(reel._id);
              if (existingReel) {
                // Merge with existing, preserving local state
                reelMap.set(reel._id, {
                  ...reel,
                  isLiked: existingReel.isLiked,
                  isSaved: existingReel.isSaved,
                  likesCount: reel.likesCount || existingReel.likesCount || 0,
                  commentsCount: state.commentCounts[reel._id] || reel.commentsCount || existingReel.commentsCount || 0,
                  savesCount: reel.savesCount || existingReel.savesCount || 0
                });
              } else {
                reelMap.set(reel._id, {
                  ...reel,
                  commentsCount: state.commentCounts[reel._id] || reel.commentsCount || 0
                });
              }
            }
          });
          
          const allReels = Array.from(reelMap.values());
          const finalReels = state.isRandomMode ? shuffleArray(allReels) : allReels;
          
          return {
            reels: finalReels,
            hasLoadedReels: true,
            hasMoreReels: newReels.length >= 10,
            cacheTimestamp: Date.now()
          };
        }),
        
        updateReel: (reelId, updates) => set((state) => {
          // Update comment count cache if provided
          const newCommentCounts = { ...state.commentCounts };
          if (updates.commentsCount !== undefined) {
            newCommentCounts[reelId] = updates.commentsCount;
          }
          
          return {
            reels: state.reels.map(reel => {
              if (reel._id === reelId) {
                return { ...reel, ...updates };
              }
              return reel;
            }),
            commentCounts: newCommentCounts
          };
        }),
        
        setCurrentReelIndex: (index) => set({ currentReelIndex: index }),
        
        setPendingNavigationReelId: (reelId) => set({ pendingNavigationReelId: reelId }),
        
        shuffleCurrentReels: () => {
          const { reels } = get();
          if (reels.length > 0) {
            set({ 
              reels: shuffleArray(reels),
              currentReelIndex: 0
            });
          }
        },
        
        clearReelsCache: () => {
          set({ 
            reels: [],
            hasLoadedReels: false,
            cacheTimestamp: 0,
            currentReelIndex: 0,
            commentCounts: {},
            lastReelsFetch: 0
          });
        },
        
        setFeedType: (feedType) => {
          set({ feedType });
          // Clear cache when changing feed type
          get().clearReelsCache();
        },
        
        // Playback state
        isMuted: false,
        isPlaying: true,
        toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
        togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
        setIsPlaying: (playing) => set({ isPlaying: playing }),
        
        // Reel actions with offline support
        likeReel: async (reelId) => {
          const { socket, reels, connected } = get();
          const reel = reels.find(r => r._id === reelId);
          if (!reel) return;
          
          const newLikedState = !reel.isLiked;
          const newLikeCount = newLikedState 
            ? (reel.likesCount || 0) + 1 
            : Math.max(0, (reel.likesCount || 1) - 1);
          
          // Optimistic update
          get().updateReel(reelId, {
            isLiked: newLikedState,
            likesCount: newLikeCount
          });
          
          // If offline, add to pending operations
          if (!connected || !socket?.connected) {
            get().addPendingOperation({
              type: 'like',
              payload: { reelId, isLiked: newLikedState }
            });
            return;
          }
          
          // Send to server
          return new Promise((resolve) => {
            socket.emit('reel:like', { reelId, isLiked: newLikedState });
            setTimeout(resolve, 100); // Small delay to ensure update
          });
        },
        
        saveReel: async (reelId) => {
          const { socket, reels, user, connected } = get();
          const reel = reels.find(r => r._id === reelId);
          if (!reel || !user) return;
          
          const newSavedState = !reel.isSaved;
          const newSaveCount = newSavedState
            ? (reel.savesCount || 0) + 1
            : Math.max(0, (reel.savesCount || 1) - 1);
          
          // Optimistic update
          get().updateReel(reelId, {
            isSaved: newSavedState,
            savesCount: newSaveCount
          });
          
          // Update user's saved reels
          const updatedSavedReels = newSavedState
            ? [...(user.savedReels || []), reelId]
            : (user.savedReels || []).filter(id => id !== reelId);
          
          get().updateUserProfile({ savedReels: updatedSavedReels });
          
          // If offline, add to pending operations
          if (!connected || !socket?.connected) {
            get().addPendingOperation({
              type: 'save',
              payload: { reelId, isSaved: newSavedState }
            });
            return;
          }
          
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Save operation timed out'));
              }, 5000);
              
              const handleAck = (data: any) => {
                if (data.reelId === reelId) {
                  clearTimeout(timeout);
                  socket.off('reel:save:ack', handleAck);
                  
                  get().updateReel(reelId, {
                    isSaved: data.isSaved,
                    savesCount: data.savesCount || data.totalSaves || newSaveCount
                  });
                  
                  resolve(data);
                }
              };
              
              socket.on('reel:save:ack', handleAck);
              socket.emit('reel:save', { reelId, isSaved: newSavedState });
            });
          } catch (error) {
            console.error('Error saving reel:', error);
            
            // Revert optimistic update
            get().updateReel(reelId, {
              isSaved: !newSavedState,
              savesCount: !newSavedState
                ? (reel.savesCount || 0) + 1
                : Math.max(0, (reel.savesCount || 1) - 1)
            });
            get().updateUserProfile({ savedReels: user.savedReels });
            
            // Add to pending operations for retry
            get().addPendingOperation({
              type: 'save',
              payload: { reelId, isSaved: newSavedState }
            });
          }
        },
        
        loadMoreReels: async () => {
          const { socket, reels, isLoadingMoreReels, hasMoreReels, feedType } = get();
          
          if (isLoadingMoreReels || !hasMoreReels) return;
          
          set({ isLoadingMoreReels: true });
          
          try {
            if (socket?.connected) {
              console.log('Loading more reels via WebSocket');
              socket.emit('feed:loadMore', { 
                skip: reels.length,
                limit: 10,
                feedType
              });
            } else {
              // Fallback to REST API
              const { default: auth } = await import('@react-native-firebase/auth');
              const currentUser = auth().currentUser;
              
              if (currentUser) {
                const token = await currentUser.getIdToken();
                const response = await fetch(
                  `https://aniflixx-backend.onrender.com/api/reels?skip=${reels.length}&limit=10&feedType=${feedType}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.reels && Array.isArray(data.reels)) {
                    get().addReels(data.reels as Reel[]);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error loading more reels:', error);
          } finally {
            set({ isLoadingMoreReels: false });
          }
        },
        
        // Comments state
        comments: {},
        commentCounts: {},
        commentLoadingStates: {},
        
        addComment: (reelId, comment) => set((state) => ({
          comments: {
            ...state.comments,
            [reelId]: [...(state.comments[reelId] || []), comment]
          }
        })),
        
        setComments: (reelId, comments) => set((state) => ({
          comments: {
            ...state.comments,
            [reelId]: comments
          }
        })),
        
        updateComment: (reelId: string, commentId: string, updates: Partial<Comment>) => {
          set((state) => {
            const updateCommentRecursive = (comments: Comment[]): Comment[] => {
              return comments.map(comment => {
                if (comment.id === commentId || comment._id === commentId) {
                  return { ...comment, ...updates };
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: updateCommentRecursive(comment.replies)
                  };
                }
                return comment;
              });
            };

            return {
              comments: {
                ...state.comments,
                [reelId]: updateCommentRecursive(state.comments[reelId] || [])
              }
            };
          });
        },

        deleteComment: (reelId: string, commentId: string, parentCommentId?: string) => {
          set((state) => {
            const comments = state.comments[reelId] || [];
            
            if (parentCommentId) {
              // Delete a reply
              const updateCommentRecursive = (comments: Comment[]): Comment[] => {
                return comments.map(comment => {
                  if (comment.id === parentCommentId || comment._id === parentCommentId) {
                    return {
                      ...comment,
                      replies: comment.replies?.filter(r => r.id !== commentId && r._id !== commentId) || [],
                      replyCount: Math.max(0, (comment.replyCount || 0) - 1)
                    };
                  }
                  if (comment.replies && comment.replies.length > 0) {
                    return {
                      ...comment,
                      replies: updateCommentRecursive(comment.replies)
                    };
                  }
                  return comment;
                });
              };

              return {
                comments: {
                  ...state.comments,
                  [reelId]: updateCommentRecursive(comments)
                }
              };
            } else {
              // Delete a top-level comment
              return {
                comments: {
                  ...state.comments,
                  [reelId]: comments.filter(c => c.id !== commentId && c._id !== commentId)
                }
              };
            }
          });
        },
        
        clearCommentsCache: (reelId?: string) => {
          if (reelId) {
            set((state) => {
              const newComments = { ...state.comments };
              const newCommentCounts = { ...state.commentCounts };
              const newLoadingStates = { ...state.commentLoadingStates };
              delete newComments[reelId];
              delete newCommentCounts[reelId];
              delete newLoadingStates[reelId];
              return { 
                comments: newComments, 
                commentCounts: newCommentCounts,
                commentLoadingStates: newLoadingStates
              };
            });
          } else {
            set({ 
              comments: {}, 
              commentCounts: {},
              commentLoadingStates: {}
            });
          }
        },
        
        setCommentLoadingState: (reelId: string, loading: boolean) => {
          set((state) => ({
            commentLoadingStates: {
              ...state.commentLoadingStates,
              [reelId]: loading
            }
          }));
        },
        
        // Typing indicators
        typingUsers: {},
        setTypingUsers: (typingUsers: Record<string, any[]>) => {
          set({ typingUsers });
        },
        
        // Notifications
        notifications: [],
        unreadNotificationCount: 0,
        
        addNotification: (notification) => set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
          unreadNotificationCount: state.unreadNotificationCount + 1
        })),
        
        clearNotifications: () => set({ 
          notifications: [],
          unreadNotificationCount: 0
        }),
        
        markNotificationsAsRead: () => set({ unreadNotificationCount: 0 }),
        
        // App initialization
        initializeApp: (forceRefresh = false) => {
          const { socket, fetchReels, cacheTimestamp, feedType } = get();
          
          const isCacheStale = Date.now() - cacheTimestamp > 5 * 60 * 1000;
          
          if (forceRefresh || isCacheStale) {
            console.log('Force refreshing app data...');
            get().clearReelsCache();
          }
          
          if (socket && socket.connected) {
            console.log('Initializing app via WebSocket...');
            socket.emit('app:initialize', { 
              feedType,
              forceRefresh: forceRefresh || isCacheStale
            });
          } else {
            console.log('Socket not connected, fetching reels via REST API');
            fetchReels(forceRefresh || isCacheStale);
          }
        },
        
        // Fetch reels via REST API
        fetchReels: async (forceRefresh = false) => {
          try {
            const { cacheTimestamp, reels, feedType } = get();
            
            if (!forceRefresh && reels.length > 0 && Date.now() - cacheTimestamp < 60000) {
              console.log('Using cached reels');
              return;
            }
            
            console.log('Fetching fresh reels via REST API...');
            const { default: auth } = await import('@react-native-firebase/auth');
            const currentUser = auth().currentUser;
            
            if (!currentUser) {
              console.error('No authenticated user');
              return;
            }
            
            const token = await currentUser.getIdToken();
            const response = await fetch(
              `https://aniflixx-backend.onrender.com/api/reels?limit=30&feedType=${feedType}`, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              console.log('Fetched reels:', data.reels?.length || 0);
              
              if (data.reels && Array.isArray(data.reels)) {
                get().setReels(data.reels as Reel[]);
              }
            } else {
              console.error('Failed to fetch reels:', response.status);
            }
          } catch (error) {
            console.error('Error fetching reels:', error);
          }
        },
        
        // Fetch single reel
        fetchSingleReel: async (reelId: string) => {
          try {
            const { default: auth } = await import('@react-native-firebase/auth');
            const currentUser = auth().currentUser;
            
            if (!currentUser) return;
            
            const token = await currentUser.getIdToken();
            const response = await fetch(
              `https://aniflixx-backend.onrender.com/api/reels/${reelId}`, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.reel) {
                get().updateReel(reelId, data.reel);
              }
            }
          } catch (error) {
            console.error('Error fetching single reel:', error);
          }
        },
        
        // Profile updates
        updateProfileStats: (userId: string, stats: any) => {
          set((state) => {
            if (state.user && state.user.uid === userId) {
              return {
                user: {
                  ...state.user,
                  ...stats
                }
              };
            }
            return state;
          });
        },
        
        // Sync followers/following counts
        syncFollowersFollowing: async () => {
          try {
            const { default: auth } = await import('@react-native-firebase/auth');
            const currentUser = auth().currentUser;
            
            if (!currentUser) return;
            
            const token = await currentUser.getIdToken();
            const response = await fetch(
              `https://aniflixx-backend.onrender.com/api/user/profile`, 
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Cache-Control': 'no-cache'
                }
              }
            );
            
            if (response.ok) {
              const userData = await response.json();
              if (userData.user) {
                get().updateUserStats({
                  followersCount: userData.user.followersCount || userData.user.followers?.length || 0,
                  followingCount: userData.user.followingCount || userData.user.following?.length || 0,
                });
              }
            }
          } catch (error) {
            console.error('Error syncing followers/following:', error);
          }
        },
        
        // Force refresh all data
        forceRefreshAll: async () => {
          console.log('🔄 Force refreshing all data...');
          
          // Clear all caches
          get().clearReelsCache();
          get().clearCommentsCache();
          
          // Fetch fresh data
          await get().fetchReels(true);
          
          // Fetch fresh user profile
          const { default: auth } = await import('@react-native-firebase/auth');
          const currentUser = auth().currentUser;
          
          if (currentUser) {
            try {
              const token = await currentUser.getIdToken();
              const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/user/profile`, 
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                  }
                }
              );
              
              if (response.ok) {
                const userData = await response.json();
                get().setUser(userData.user || userData);
              }
            } catch (error) {
              console.error('Error refreshing user profile:', error);
            }
          }
        },
        
        // Cache management
        clearAllCache: async () => {
          console.log('🧹 Clearing all cache...');
          
          // Clear state caches
          get().clearReelsCache();
          get().clearCommentsCache();
          get().clearNotifications();
          
          // Clear AsyncStorage caches
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith('@aniflixx/'));
            await AsyncStorage.multiRemove(cacheKeys);
            console.log(`✅ Cleared ${cacheKeys.length} cache entries`);
          } catch (error) {
            console.error('Error clearing cache:', error);
          }
        },
        
        getCacheSize: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith('@aniflixx/'));
            
            let totalSize = 0;
            for (const key of cacheKeys) {
              const value = await AsyncStorage.getItem(key);
              if (value) {
                totalSize += new Blob([value]).size;
              }
            }
            
            return totalSize;
          } catch (error) {
            console.error('Error calculating cache size:', error);
            return 0;
          }
        },
        
        optimizeCache: async () => {
          console.log('🔧 Optimizing cache...');
          
          // Remove old cached data
          const { reels, comments } = get();
          const now = Date.now();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          // Remove old reels
          const recentReels = reels.filter(reel => {
            if (!reel.createdAt) return true; // Keep reels without dates
            const createdAt = new Date(reel.createdAt).getTime();
            return now - createdAt < maxAge;
          });
          
          if (recentReels.length < reels.length) {
            console.log(`Removed ${reels.length - recentReels.length} old reels`);
            set({ reels: recentReels });
          }
          
          // Clear old comments
          const reelIds = Object.keys(comments);
          const activeReelIds = recentReels.map(r => r._id);
          
          reelIds.forEach(reelId => {
            if (!activeReelIds.includes(reelId)) {
              get().clearCommentsCache(reelId);
            }
          });
          
          console.log('✅ Cache optimization complete');
        },
        
        // Reset store
        reset: () => {
          // Clear all caches first
          get().clearAllCache();
          
          // Reset state
          set({
            user: null,
            isAuthenticated: false,
            socket: null,
            connected: false,
            reels: [],
            currentReelIndex: 0,
            hasLoadedReels: false,
            isLoadingMoreReels: false,
            hasMoreReels: true,
            isRandomMode: true,
            isMuted: false,
            isPlaying: true,
            comments: {},
            commentCounts: {},
            commentLoadingStates: {},
            typingUsers: {},
            notifications: [],
            unreadNotificationCount: 0,
            lastReelsFetch: 0,
            feedType: 'home',
            cacheTimestamp: 0,
            pendingNavigationReelId: null,
            connectionState: {
              lastConnectionTime: 0,
              lastDisconnectionTime: 0,
              connectionAttempts: 0,
              connectionErrors: [],
              networkType: 'unknown',
              connectionQuality: 'offline',
              pendingOperations: [],
            }
          });
        }
      })),
      {
        name: 'aniflixx-storage',
        version: 1,
        storage: {
          getItem: async (name: string) => {
            try {
              const value = await AsyncStorage.getItem(name);
              return value ? JSON.parse(value) : null;
            } catch {
              return null;
            }
          },
          setItem: async (name: string, value: any) => {
            try {
              await AsyncStorage.setItem(name, JSON.stringify(value));
            } catch (error) {
              console.error('Error saving to AsyncStorage:', error);
            }
          },
          removeItem: async (name: string) => {
            try {
              await AsyncStorage.removeItem(name);
            } catch (error) {
              console.error('Error removing from AsyncStorage:', error);
            }
          },
        },
        partialize: (state) => ({
          // Only persist essential data
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isMuted: state.isMuted,
          feedType: state.feedType,
          connectionState: {
            lastConnectionTime: state.connectionState.lastConnectionTime,
            lastDisconnectionTime: state.connectionState.lastDisconnectionTime,
            pendingOperations: state.connectionState.pendingOperations,
          }
        }),
      }
    )
  )
);

// Load connection state on app start
AsyncStorage.getItem(CONNECTION_STATE_KEY).then((stored) => {
  if (stored) {
    try {
      const data = JSON.parse(stored);
      useAppStore.getState().updateConnectionState(data);
    } catch (error) {
      console.error('Error loading connection state:', error);
    }
  }
}).catch(console.error);
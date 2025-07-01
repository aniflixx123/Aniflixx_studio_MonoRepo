// store/appStore.ts - Enhanced with Better Synchronization
import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { User, Reel, Comment, NotificationEvent } from '../types';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// Shuffle utility function
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUserStats: (stats: Partial<User>) => void;
  
  // WebSocket state
  socket: Socket | null;
  connected: boolean;
  setSocket: (socket: Socket | null) => void;
  setConnected: (connected: boolean) => void;
  
  // Reels state
  reels: Reel[];
  currentReelIndex: number;
  hasLoadedReels: boolean;
  isLoadingMoreReels: boolean;
  hasMoreReels: boolean;
  isRandomMode: boolean;
  cacheTimestamp: number;
  pendingNavigationReelId: string | null;
  setReels: (reels: Reel[]) => void;
  addReels: (reels: Reel[]) => void;
  updateReel: (reelId: string, updates: Partial<Reel>) => void;
  setCurrentReelIndex: (index: number) => void;
  shuffleCurrentReels: () => void;
  clearReelsCache: () => void;
  setPendingNavigationReelId: (reelId: string | null) => void;
  
  // Playback state
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  
  // Reel actions
  likeReel: (reelId: string) => Promise<void>;
  saveReel: (reelId: string) => Promise<void>;
  loadMoreReels: () => Promise<void>;
  
  // Comments state
  comments: Record<string, Comment[]>;
  commentCounts: Record<string, number>;
  addComment: (reelId: string, comment: Comment) => void;
  setComments: (reelId: string, comments: Comment[]) => void;
  updateComment: (reelId: string, commentId: string, updates: Partial<Comment>) => void;
  deleteComment: (reelId: string, commentId: string, parentCommentId?: string) => void;
  clearCommentsCache: (reelId?: string) => void;
  
  // Typing indicators
  typingUsers: Record<string, Array<{ uid: string; username: string }>>;
  setTypingUsers: (typingUsers: Record<string, any[]>) => void;
  
  // Notifications
  notifications: NotificationEvent[];
  addNotification: (notification: NotificationEvent) => void;
  clearNotifications: () => void;
  
  // Feed state
  lastReelsFetch: number;
  feedType: 'home' | 'following' | 'trending';
  setFeedType: (type: 'home' | 'following' | 'trending') => void;
  
  // App initialization
  initializeApp: (forceRefresh?: boolean) => void;
  fetchReels: (forceRefresh?: boolean) => Promise<void>;
  fetchSingleReel: (reelId: string) => Promise<void>;
  reset: () => void;

  // Additional methods
  updateProfileStats: (userId: string, stats: any) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  forceRefreshAll: () => Promise<void>;
  syncFollowersFollowing: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  devtools(
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
            // Ensure counts are numbers
            followersCount: stats.followersCount !== undefined ? Number(stats.followersCount) : state.user.followersCount,
            followingCount: stats.followingCount !== undefined ? Number(stats.followingCount) : state.user.followingCount,
          };
          
          console.log('📊 Updated user stats:', updatedUser);
          return { user: updatedUser };
        });
      },
      
      // WebSocket state
      socket: null,
      connected: false,
      setSocket: (socket) => set({ socket }),
      setConnected: (connected) => set({ connected }),
      
      // Reels state
      reels: [],
      currentReelIndex: 0,
      hasLoadedReels: false,
      isLoadingMoreReels: false,
      hasMoreReels: true,
      isRandomMode: true,
      cacheTimestamp: 0,
      pendingNavigationReelId: null,
      
      setReels: (reels) => {
        const shuffledReels = shuffleArray(reels);
        
        set({ 
          reels: shuffledReels, 
          hasLoadedReels: true,
          hasMoreReels: shuffledReels.length >= 20,
          cacheTimestamp: Date.now()
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
                // Use the latest counts
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
        const shuffledReels = shuffleArray(allReels);
        
        return {
          reels: shuffledReels,
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
          commentCounts: {}
        });
      },
      
      // Playback state
      isMuted: false,
      isPlaying: true,
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      
      // Reel actions
      likeReel: async (reelId) => {
        const { socket, reels } = get();
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
        
        // Send to server
        if (socket?.connected) {
          return new Promise((resolve) => {
            socket.emit('reel:like', { reelId, isLiked: newLikedState });
            setTimeout(resolve, 100); // Small delay to ensure update
          });
        }
      },
      
      saveReel: async (reelId) => {
        const { socket, reels, user } = get();
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
        
        try {
          if (socket?.connected) {
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
          } else {
            // Fallback to REST API
            const { default: auth } = await import('@react-native-firebase/auth');
            const currentUser = auth().currentUser;
            
            if (currentUser) {
              const token = await currentUser.getIdToken();
              const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/reels/${reelId}/save`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                get().updateReel(reelId, {
                  isSaved: data.saved,
                  savesCount: data.savesCount || newSaveCount
                });
              } else {
                throw new Error('Failed to save reel');
              }
            }
          }
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
        }
      },
      
      loadMoreReels: async () => {
        const { socket, reels, isLoadingMoreReels, hasMoreReels } = get();
        
        if (isLoadingMoreReels || !hasMoreReels) return;
        
        set({ isLoadingMoreReels: true });
        
        try {
          if (socket?.connected) {
            console.log('Loading more reels via WebSocket, current count:', reels.length);
            socket.emit('feed:loadMore', { 
              skip: reels.length,
              limit: 10,
              feedType: get().feedType
            });
          } else {
            const { default: auth } = await import('@react-native-firebase/auth');
            const currentUser = auth().currentUser;
            
            if (currentUser) {
              const token = await currentUser.getIdToken();
              const response = await fetch(
                `https://aniflixx-backend.onrender.com/api/reels?skip=${reels.length}&limit=10`,
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
            delete newComments[reelId];
            delete newCommentCounts[reelId];
            return { comments: newComments, commentCounts: newCommentCounts };
          });
        } else {
          set({ comments: {}, commentCounts: {} });
        }
      },
      
      // Typing indicators
      typingUsers: {},
      setTypingUsers: (typingUsers: Record<string, any[]>) => {
        set({ typingUsers });
      },
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications].slice(0, 50)
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // Feed state
      lastReelsFetch: 0,
      feedType: 'home',
      setFeedType: (feedType) => set({ feedType }),
      
      // App initialization
      initializeApp: (forceRefresh = false) => {
        const { socket, fetchReels, cacheTimestamp } = get();
        
        const isCacheStale = Date.now() - cacheTimestamp > 5 * 60 * 1000;
        
        if (forceRefresh || isCacheStale) {
          console.log('Force refreshing app data...');
          get().clearReelsCache();
        }
        
        if (socket && socket.connected) {
          console.log('Initializing app via WebSocket...');
          socket.emit('app:initialize', { 
            feedType: get().feedType,
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
          const { cacheTimestamp, reels } = get();
          
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
          const response = await fetch('https://aniflixx-backend.onrender.com/api/reels?limit=30', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
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
          const response = await fetch(`https://aniflixx-backend.onrender.com/api/reels/${reelId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
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
      
      updateUserProfile: (updates: Partial<User>) => {
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
      
      // Sync followers/following counts
      syncFollowersFollowing: async () => {
        try {
          const { default: auth } = await import('@react-native-firebase/auth');
          const currentUser = auth().currentUser;
          
          if (!currentUser) return;
          
          const token = await currentUser.getIdToken();
          const response = await fetch(`https://aniflixx-backend.onrender.com/api/user/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            }
          });
          
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
            const response = await fetch(`https://aniflixx-backend.onrender.com/api/user/profile`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              get().setUser(userData.user || userData);
            }
          } catch (error) {
            console.error('Error refreshing user profile:', error);
          }
        }
      },
      
      // Reset store
      reset: () => set({
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
        typingUsers: {},
        notifications: [],
        lastReelsFetch: 0,
        feedType: 'home',
        cacheTimestamp: 0,
        pendingNavigationReelId: null
      })
    }))
  )
);
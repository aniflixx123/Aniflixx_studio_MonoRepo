// ReelsComponent.tsx - Fixed Navigation Issues (No Auto-Scroll on Video Complete)
import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo, useState, memo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  StatusBar,
  Share,
  Platform,
  Dimensions,
  AppState,
  RefreshControl,
  ViewToken,
  Animated,
  Easing,
  ActivityIndicator,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Reel } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { useWebSocket } from '../services/WebSocketManager';
import ReelItem from '../components/ReelItem';
import NativeAdItem from '../components/NativeAdItem';
import CommentsModal from '../components/CommentsModal';
import auth from '@react-native-firebase/auth';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ============ AD CONTROL - CHANGE THIS TO ENABLE/DISABLE ADS ============
const ADS_ENABLED = false; // Set to true to show ads, false to disable
// ========================================================================

// Ad configuration
const interstitialAdUnitId = 'ca-app-pub-2967300488956409/8989024537';
const nativeAdUnitId = 'ca-app-pub-2967300488956409/9397370024';
const AD_FREQUENCY = 2;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Types for feed items
type FeedItem = 
  | { type: 'reel'; data: Reel; id: string }
  | { type: 'ad'; id: string };

// Optimized constants
const PRELOAD_OFFSET = 1;
const VIEWABILITY_THRESHOLD = 80;
const VIEWABILITY_MIN_TIME = 50;
const MEMORY_CLEANUP_THRESHOLD = 10;

export interface ReelsComponentHandle {
  pauseAllVideos: () => void;
  resumePlayback: () => void;
  refreshReels: () => void;
  scrollToReel: (index: number) => void;
}

interface ReelsComponentProps {
  isActive?: boolean;
  initialReelId?: string;
  initialIndex?: number;
}

interface ViewableItem extends ViewToken {
  index: number;
}

const ReelsComponent = forwardRef<ReelsComponentHandle, ReelsComponentProps>((props, ref) => {
  const { isActive = true, initialReelId, initialIndex } = props;
  const insets = useSafeAreaInsets();

  // Store state - single source of truth
  const reels = useAppStore(state => state.reels);
  const currentReelIndex = useAppStore(state => state.currentReelIndex);
  const socket = useAppStore(state => state.socket);
  const connected = useAppStore(state => state.connected);
  const isMuted = useAppStore(state => state.isMuted);
  const isPlaying = useAppStore(state => state.isPlaying);
  const hasLoadedReels = useAppStore(state => state.hasLoadedReels);
  const cacheTimestamp = useAppStore(state => state.cacheTimestamp);
  
  // Interstitial ad ref
  const interstitialRef = useRef<InterstitialAd | null>(
    ADS_ENABLED 
      ? InterstitialAd.createForAdRequest(interstitialAdUnitId, {
          requestNonPersonalizedAdsOnly: true,
        })
      : null
  );
  
  // Store actions
  const {
    setCurrentReelIndex,
    toggleMute,
    togglePlay,
    setIsPlaying,
    likeReel,
    saveReel,
    updateReel,
    initializeApp,
    loadMoreReels,
    fetchReels,
    shuffleCurrentReels,
    forceRefreshAll,
    clearReelsCache,
    fetchSingleReel,
  } = useAppStore();

  // Local state for UI only
  const [refreshing, setRefreshing] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [preloadedIndexes, setPreloadedIndexes] = useState<Set<number>>(new Set());
  const [lastAdIndex, setLastAdIndex] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 2 });
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);

  // Animation values
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const currentReelRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);
  const eventCleanupRef = useRef<(() => void)[]>([]);
  const lastFocusTime = useRef(0);
  const pendingScrollRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket context
  const { subscribe } = useWebSocket();

  // Create feed data with ads
  const feedData = useMemo(() => {
    const feed: FeedItem[] = [];
    let adCounter = 0;
    
    reels.forEach((reel, index) => {
      feed.push({
        type: 'reel',
        data: reel,
        id: reel._id,
      });
      
      if (ADS_ENABLED && (index + 1) % AD_FREQUENCY === 0 && index < reels.length - 1) {
        feed.push({
          type: 'ad',
          id: `ad-${adCounter++}`,
        });
      }
    });
    
    return feed;
  }, [reels]);

  // Convert between feed and reel indices
  const feedIndexToReelIndex = useCallback((feedIndex: number): number => {
    let reelIndex = 0;
    for (let i = 0; i <= feedIndex && i < feedData.length; i++) {
      if (feedData[i].type === 'reel') {
        if (i < feedIndex) reelIndex++;
      }
    }
    return Math.max(0, reelIndex - 1);
  }, [feedData]);

  const reelIndexToFeedIndex = useCallback((reelIndex: number): number => {
    let feedIndex = 0;
    let currentReelIndex = 0;
    
    for (let i = 0; i < feedData.length; i++) {
      if (feedData[i].type === 'reel') {
        if (currentReelIndex === reelIndex) {
          return i;
        }
        currentReelIndex++;
      }
    }
    
    return feedIndex;
  }, [feedData]);

  // Viewability config
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: VIEWABILITY_THRESHOLD,
    minimumViewTime: VIEWABILITY_MIN_TIME,
    waitForInteraction: false,
  }), []);

  // Force refresh on focus with cache check
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      // Prevent rapid refreshes (minimum 2 seconds between refreshes)
      if (now - lastFocusTime.current < 2000) {
        return;
      }
      
      lastFocusTime.current = now;
      
      // Check if cache is stale (older than 5 minutes)
      const isCacheStale = now - cacheTimestamp > 5 * 60 * 1000;
      
      if (isCacheStale && !refreshing) {
        console.log('Cache is stale, refreshing data...');
        forceRefreshAll();
      }
      
      // Resume playback if needed
      if (isActive && !isPlaying && reels.length > 0 && !isInitializing) {
        const timer = setTimeout(() => {
          if (isActive && !isPlaying) {
            console.log('Resuming playback from focus');
            togglePlay();
          }
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }, [isActive, isPlaying, togglePlay, reels.length, isInitializing, cacheTimestamp, refreshing, forceRefreshAll])
  );

  // Interstitial Ad initialization
  useEffect(() => {
    if (!ADS_ENABLED || !interstitialRef.current) return;
    
    const unsubscribeLoaded = interstitialRef.current.addAdEventListener(AdEventType.LOADED, () => {
      interstitialRef.current?.show();
    });
  
    const unsubscribeClosed = interstitialRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialRef.current?.load();
    });
  
    interstitialRef.current.load();
  
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  // Cleanup WebSocket events
  const cleanupEvents = useCallback(() => {
    eventCleanupRef.current.forEach(cleanup => cleanup());
    eventCleanupRef.current = [];
  }, []);

  // Initialize app data with proper cache management
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        setIsInitializing(true);
        
        // Check if we need to refresh based on cache age
        const now = Date.now();
        const isCacheStale = now - cacheTimestamp > 5 * 60 * 1000;
        
        if (hasLoadedReels && reels.length > 0 && !isCacheStale) {
          setIsInitializing(false);
          return;
        }
        
        // Clear stale cache
        if (isCacheStale) {
          console.log('Clearing stale cache on init');
          clearReelsCache();
        }
        
        // Load user profile if needed
        const currentUser = auth().currentUser;
        if (currentUser && !useAppStore.getState().user) {
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
              useAppStore.getState().setUser(userData.user || userData);
            }
          } catch (error) {
            console.error('Error loading user profile:', error);
          }
        }
        
        // Initialize app data
        if (socket?.connected) {
          initializeApp(true); // Force refresh on init
        } else {
          await fetchReels(true); // Force refresh on init
        }
        
        if (mounted) {
          Animated.timing(loadingOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            if (mounted) setIsInitializing(false);
          });
        }
      } catch (error) {
        console.error('Error initializing:', error);
        if (mounted) setIsInitializing(false);
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty deps to run only on mount

  // Preload videos
  const preloadVideos = useCallback((centerIndex: number) => {
    const newPreloadedIndexes = new Set<number>();
    
    const start = Math.max(0, centerIndex - PRELOAD_OFFSET);
    const end = Math.min(feedData.length - 1, centerIndex + PRELOAD_OFFSET);
    
    for (let i = start; i <= end; i++) {
      newPreloadedIndexes.add(i);
    }
    
    setVisibleRange({
      start: Math.max(0, centerIndex - MEMORY_CLEANUP_THRESHOLD),
      end: Math.min(feedData.length - 1, centerIndex + MEMORY_CLEANUP_THRESHOLD)
    });
    
    setPreloadedIndexes(newPreloadedIndexes);
  }, [feedData.length]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!socket?.connected) return;
    
    cleanupEvents();
    
    const unsubLike = subscribe('reel:liked', (data: any) => {
      updateReel(data.reelId, {
        likesCount: data.totalLikes || data.likesCount || 0,
        isLiked: data.userId === auth().currentUser?.uid ? data.isLiked : undefined
      });
    });
    
    const unsubSave = subscribe('reel:saved', (data: any) => {
      updateReel(data.reelId, {
        isSaved: data.userId === auth().currentUser?.uid ? data.isSaved : undefined
      });
    });
    
    const unsubComment = subscribe('comment:new', (data: any) => {
      // Fetch fresh reel data to get accurate comment count
      fetchSingleReel(data.reelId);
    });
    
    const unsubCommentDel = subscribe('comment:deleted', (data: any) => {
      // Fetch fresh reel data to get accurate comment count
      fetchSingleReel(data.reelId);
    });
    
    // Listen for data refresh events
    const unsubRefresh = subscribe('data:refresh', () => {
      console.log('Received data refresh event');
      forceRefreshAll();
    });
    
    eventCleanupRef.current = [unsubLike, unsubSave, unsubComment, unsubCommentDel, unsubRefresh];
    
    return cleanupEvents;
  }, [socket?.connected, subscribe, updateReel, fetchSingleReel, forceRefreshAll, cleanupEvents]);

  // Handle reel viewing
  useEffect(() => {
    if (!socket?.connected || !isActive) return;

    const currentItem = feedData[currentFeedIndex];
    if (!currentItem || currentItem.type !== 'reel') return;

    const currentReel = currentItem.data;
    
    if (currentReelRef.current !== currentReel._id) {
      if (currentReelRef.current) {
        socket.emit('reel:leave', { reelId: currentReelRef.current });
      }
      currentReelRef.current = currentReel._id;
      socket.emit('reel:join', { reelId: currentReel._id });
      
      preloadVideos(currentFeedIndex);
    }
  }, [currentFeedIndex, feedData, socket, isActive, preloadVideos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEvents();
      if (currentReelRef.current && socket?.connected) {
        socket.emit('reel:leave', { reelId: currentReelRef.current });
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [socket, cleanupEvents]);

  // FIXED: Simplified initial navigation
  useEffect(() => {
    // Skip if already scrolled or no initial navigation needed
    if (hasScrolledToInitial || !feedData.length || isInitializing) {
      return;
    }

    // Check if we have initial navigation params
    const hasInitialNav = initialReelId || initialIndex !== undefined;
    if (!hasInitialNav) {
      setHasScrolledToInitial(true);
      return;
    }

    // Calculate target index
    let targetIndex = 0;
    
    if (initialReelId) {
      const reelIndex = reels.findIndex(r => r._id === initialReelId);
      if (reelIndex >= 0) {
        targetIndex = reelIndexToFeedIndex(reelIndex);
      }
    } else if (initialIndex !== undefined) {
      targetIndex = reelIndexToFeedIndex(initialIndex);
    }

    // Validate target index
    if (targetIndex < 0 || targetIndex >= feedData.length) {
      setHasScrolledToInitial(true);
      return;
    }

    // Mark as scrolled immediately to prevent multiple attempts
    setHasScrolledToInitial(true);
    
    console.log('Scrolling to initial index:', targetIndex);
    
    // Update current indices immediately
    setCurrentFeedIndex(targetIndex);
    const reelIndex = feedIndexToReelIndex(targetIndex);
    setCurrentReelIndex(reelIndex);

    // Pause playback during scroll
    setIsPlaying(false);

    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Schedule the scroll
    scrollTimeoutRef.current = setTimeout(() => {
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: targetIndex,
            animated: false,
            viewPosition: 0
          });
          
          // Resume playback after scroll completes
          setTimeout(() => {
            if (isActive) {
              setIsPlaying(true);
            }
          }, 200);
        } catch (error) {
          console.error('Error scrolling to initial index:', error);
          // Fallback: scroll to offset
          flatListRef.current.scrollToOffset({
            offset: targetIndex * SCREEN_HEIGHT,
            animated: false
          });
        }
      }
    }, 100); // Small delay to ensure FlatList is ready

  }, [initialReelId, initialIndex, feedData.length, reels, isInitializing, hasScrolledToInitial, isActive, reelIndexToFeedIndex, feedIndexToReelIndex, setCurrentReelIndex, setIsPlaying]);

  // Reset scroll flag when navigation params change
  useEffect(() => {
    setHasScrolledToInitial(false);
  }, [initialReelId, initialIndex]);

  // App state handling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App became active
        if (isActive && !isPlaying) {
          togglePlay();
        }
        
        // Check for stale data
        const now = Date.now();
        const isCacheStale = now - cacheTimestamp > 5 * 60 * 1000;
        
        if (isCacheStale) {
          forceRefreshAll();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        if (isPlaying) togglePlay();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isActive, isPlaying, togglePlay, cacheTimestamp, forceRefreshAll]);

  // Actions
  const pauseAllVideos = useCallback(() => {
    if (isPlaying) togglePlay();
  }, [isPlaying, togglePlay]);

  const resumePlayback = useCallback(() => {
    if (!isPlaying && isActive) togglePlay();
  }, [isPlaying, isActive, togglePlay]);

  const scrollToReel = useCallback((index: number) => {
    const feedIndex = reelIndexToFeedIndex(index);
    if (feedIndex >= 0 && feedIndex < feedData.length) {
      // Pause during scroll
      setIsPlaying(false);
      
      // Update indices immediately
      setCurrentFeedIndex(feedIndex);
      setCurrentReelIndex(index);
      
      // Scroll after a frame
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToIndex({
          index: feedIndex,
          animated: true,
          viewPosition: 0.5
        });
        
        // Resume playback
        setTimeout(() => {
          setIsPlaying(true);
        }, 300);
      });
    }
  }, [feedData.length, reelIndexToFeedIndex, setCurrentReelIndex, setIsPlaying]);

  // Refresh with proper cache clearing
  const refreshReels = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      // Always force refresh when user pulls to refresh
      await forceRefreshAll();
      
      // Scroll to top
      if (flatListRef.current && feedData.length > 0) {
        flatListRef.current.scrollToIndex({
          index: 0,
          animated: false
        });
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  }, [refreshing, forceRefreshAll, feedData.length]);

  useImperativeHandle(ref, () => ({
    pauseAllVideos,
    resumePlayback,
    refreshReels,
    scrollToReel
  }), [pauseAllVideos, resumePlayback, refreshReels, scrollToReel]);

  // Handlers
  const shareReel = useCallback(async (id: string) => {
    const reel = reels.find(r => r._id === id);
    if (!reel) return;

    try {
      await Share.share({
        message: `Check out this awesome ${reel.title || 'anime'} clip on AniFlixx!`,
        url: `https://aniflixx.com/reel/${id}`,
        title: reel.title || 'AniFlixx Clip',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [reels]);

  const handleDoubleTapLike = useCallback(() => {
    const currentItem = feedData[currentFeedIndex];
    if (currentItem && currentItem.type === 'reel') {
      const reel = currentItem.data;
      if (!reel.isLiked) {
        setDoubleTapLike(true);
        setTimeout(() => setDoubleTapLike(false), 800);
        likeReel(reel._id);
      }
    }
  }, [currentFeedIndex, feedData, likeReel]);

  const handleOpenComments = useCallback((reelId: string) => {
    setActiveReelId(reelId);
    setCommentsVisible(true);
  }, []);

  // FIXED: Optimized viewable items handler
  const onViewableItemsChanged = useMemo(() => {
    let isProcessing = false;
    
    return ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0 || isProcessing) return;
      
      const newIndex = viewableItems[0].index;
      if (newIndex == null) return;
      
      // Prevent processing same index multiple times
      isProcessing = true;
      
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(() => {
        if (newIndex !== currentFeedIndex) {
          console.log('Viewable item changed to:', newIndex);
          setCurrentFeedIndex(newIndex);
          
          const currentItem = feedData[newIndex];
          if (currentItem && currentItem.type === 'reel') {
            const reelIndex = feedIndexToReelIndex(newIndex);
            setCurrentReelIndex(reelIndex);
          }
          
          if (commentsVisible) {
            setCommentsVisible(false);
            setActiveReelId(null);
          }
          
          // Load more reels when near the end
          if (newIndex >= feedData.length - 3) {
            loadMoreReels();
          }
          
          // Show interstitial ad
          if (ADS_ENABLED && newIndex > 0 && newIndex % 15 === 0 && newIndex !== lastAdIndex) {
            setLastAdIndex(newIndex);
            if (interstitialRef.current?.loaded) {
              interstitialRef.current.show();
            }
          }
        }
        
        isProcessing = false;
      });
    };
  }, [currentFeedIndex, feedData, setCurrentReelIndex, loadMoreReels, commentsVisible, lastAdIndex, feedIndexToReelIndex]);

  // Render function - REMOVED auto-scroll on video complete
  const renderFeedItem = useCallback(({ item, index }: { item: FeedItem; index: number }) => {
    const isCurrentItem = index === currentFeedIndex;
    const shouldPreload = preloadedIndexes.has(index);
    const isInVisibleRange = index >= visibleRange.start && index <= visibleRange.end;

    if (!isInVisibleRange && !isCurrentItem) {
      return <View style={{ height: SCREEN_HEIGHT }} />;
    }

    if (item.type === 'ad') {
      return (
        <NativeAdItem
          adUnitId={nativeAdUnitId}
          isActive={isCurrentItem && isActive}
          reelHeight={SCREEN_HEIGHT}
          bottomOffset={0}
          onAdLoaded={() => console.log('Native ad loaded')}
        />
      );
    }

    const reel = item.data;
    return (
      <ReelItem
        reel={reel}
        isActive={isCurrentItem && isActive}
        shouldPreload={shouldPreload}
        onDoubleTapLike={isCurrentItem ? handleDoubleTapLike : undefined}
        onLike={() => likeReel(reel._id)}
        onSave={() => saveReel(reel._id)}
        onComment={() => handleOpenComments(reel._id)}
        onShare={() => shareReel(reel._id)}
        onToggleMute={toggleMute}
        onTogglePlay={togglePlay}
        onVideoComplete={() => {
          // Video complete callback - NO AUTO-SCROLL
          // You can add any other logic here if needed when video completes
          console.log('Video completed for reel:', reel._id);
        }}
        isMuted={isMuted}
        isPlaying={isPlaying && isCurrentItem}
        doubleTapLikeAnimVisible={doubleTapLike && isCurrentItem}
        viewerCount={reel.viewers || 0}
        reelHeight={SCREEN_HEIGHT}
        bottomOffset={0}
        socket={socket}
      />
    );
  }, [
    currentFeedIndex, isActive, preloadedIndexes, handleDoubleTapLike, 
    likeReel, saveReel, shareReel, isMuted, isPlaying, doubleTapLike, 
    toggleMute, togglePlay, socket, handleOpenComments, feedData.length, 
    visibleRange, commentsVisible
  ]);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    return item.id || `feed-${index}`;
  }, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // Loading screen
  if (isInitializing) {
    return (
      <Animated.View style={[styles.loadingContainer, { opacity: loadingOpacity }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color="#ff3366" />
        <Text style={styles.loadingText}>Loading amazing content...</Text>
      </Animated.View>
    );
  }

  // Empty state
  if (!feedData || feedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Text style={styles.emptyText}>No flicks available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshReels}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeReel = feedData[currentFeedIndex]?.type === 'reel' 
    ? feedData[currentFeedIndex].data as Reel
    : null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={feedData}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={1}
        updateCellsBatchingPeriod={100}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        initialScrollIndex={0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshReels}
            tintColor="#ff3366"
            colors={['#ff3366']}
            progressViewOffset={insets.top}
          />
        }
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current && info.index < feedData.length && info.index >= 0) {
              flatListRef.current.scrollToIndex({
                index: Math.min(info.index, feedData.length - 1),
                animated: false
              });
            }
          });
        }}
        bounces={true}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        alwaysBounceVertical={false}
        overScrollMode="never"
        disableIntervalMomentum={true}
        disableVirtualization={false}
      />

      {commentsVisible && activeReelId && activeReel && (
        <CommentsModal
          visible={commentsVisible}
          reelId={activeReelId}
          totalComments={activeReel.commentsCount || 0}
          onClose={() => {
            setCommentsVisible(false);
            setActiveReelId(null);
            // Fetch fresh data for this reel to ensure comment count is accurate
            fetchSingleReel(activeReelId);
          }}
          onCommentsCountChange={(newCount) => {
            if (activeReelId) {
              updateReel(activeReelId, { commentsCount: newCount });
            }
          }}
        />
      )}
    </View>
  );
});

ReelsComponent.displayName = 'ReelsComponent';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ff3366',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default memo(ReelsComponent);
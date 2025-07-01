import React, { useRef, useState, memo, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Image,
  Text,
  Dimensions,
  TouchableOpacity,
  Modal,
  Pressable,
  Clipboard,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
  Easing,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { Reel } from '../types';
import useDoubleTap from '../hooks/useDoubleTap';
import FollowButton from './FollowButton';
import auth from '@react-native-firebase/auth';

const { height, width } = Dimensions.get('window');

// Custom debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let result: any;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  
  const leading = options?.leading ?? false;
  const trailing = options?.trailing !== false;

  const invokeFunc = (time: number) => {
    const args = lastArgs;
    const thisArg = lastThis;
    
    lastArgs = lastThis = null;
    lastInvokeTime = time;
    result = func.apply(thisArg, args!);
    return result;
  };

  const leadingEdge = (time: number) => {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return timeWaiting;
  };

  const shouldInvoke = (time: number) => {
    return lastCallTime === null || (time - (lastCallTime || 0)) >= wait;
  };

  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  };

  const trailingEdge = (time: number) => {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  };

  const cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeout = null;
  };

  const debounced = function(this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime);
      }
      if (wait === 0) {
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === null) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  } as T & { cancel: () => void };

  debounced.cancel = cancel;
  return debounced;
}

interface OptimizedReelItemProps {
  reel: Reel;
  isActive: boolean;
  shouldPreload?: boolean;
  onDoubleTapLike?: () => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onVideoComplete?: () => void;
  isMuted: boolean;
  isPlaying: boolean;
  doubleTapLikeAnimVisible: boolean;
  viewerCount: number;
  reelHeight?: number;
  bottomOffset: number;
  socket?: any;
}

const ReelItem = memo((props: OptimizedReelItemProps) => {
  const {
    reel, isActive, shouldPreload = false, onDoubleTapLike, onLike, onComment, 
    onShare, onTogglePlay, isMuted, isPlaying, doubleTapLikeAnimVisible, 
    viewerCount, onSave, reelHeight = height
  } = props;

  const insets = useSafeAreaInsets();
  const videoPlayerRef = useRef<any>(null);
  const navigation = useNavigation<any>();

  const heartAnim = useRef(new Animated.Value(0)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const saveScaleAnim = useRef(new Animated.Value(1)).current;

  // Video state
  const [videoReady, setVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Calculate safe bottom offset - accounting for bottom nav bar
  const bottomNavHeight = Platform.OS === 'ios' ? 80 : 60;
  const safeBottomOffset = bottomNavHeight + (insets.bottom || 0) + 10;

  // Add focus effect to pause video when navigating away
  useFocusEffect(
    useCallback(() => {
      // Component is focused
      return () => {
        // Component is losing focus - pause the video
        if (videoPlayerRef.current && isPlaying) {
          videoPlayerRef.current.pause();
        }
      };
    }, [isPlaying])
  );

  // Preload video when shouldPreload is true
  useEffect(() => {
    if (shouldPreload && videoPlayerRef.current && !isActive) {
      videoPlayerRef.current.seek(0);
    }
  }, [shouldPreload, isActive]);

  // Heart animation
  useEffect(() => {
    if (doubleTapLikeAnimVisible && isActive) {
      heartAnim.setValue(0);

      Animated.sequence([
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.delay(200),
        Animated.timing(heartAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [doubleTapLikeAnimVisible, isActive, heartAnim]);

  const handleVideoLoad = useCallback(() => {
    setVideoReady(true);
    setHasError(false);
    setIsBuffering(false);
  }, []);

  const handleVideoError = useCallback((error: any) => {
    console.error('Video error:', error);
    setHasError(true);
    setVideoReady(false);
  }, []);

  const handleDoubleTap = useDoubleTap(() => {
    if (isActive && onDoubleTapLike) {
      onDoubleTapLike();
    }
  });

  // Debounced like handler
  const debouncedLike = useMemo(
    () => debounce(() => {
      onLike();
    }, 300, { leading: true, trailing: false }),
    [onLike]
  );

  // Debounced save handler
  const debouncedSave = useMemo(
    () => debounce(() => {
      onSave();
    }, 300, { leading: true, trailing: false }),
    [onSave]
  );

  const handleLike = useCallback(() => {
    // Animation stays immediate
    Animated.sequence([
      Animated.spring(likeScaleAnim, {
        toValue: 1.3,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Debounced action
    debouncedLike();
  }, [debouncedLike, likeScaleAnim]);

  const handleSave = useCallback(() => {
    // Animation stays immediate
    Animated.sequence([
      Animated.spring(saveScaleAnim, {
        toValue: 1.3,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(saveScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Debounced action
    debouncedSave();
  }, [debouncedSave, saveScaleAnim]);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report Content",
      "Are you sure you want to report this content?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Report",
          onPress: () => {
            Alert.alert("Thank you", "Your report has been submitted");
          }
        }
      ]
    );
  }, []);

  const currentUser = auth().currentUser;
  const isOwnReel = currentUser?.uid === reel.uid;

  const heartScale = heartAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.2, 1],
  });

  const heartOpacity = heartAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Handle profile navigation - Updated to pause video
  const handleProfilePress = useCallback(() => {
    if (reel.uid) {
      // Pause the current video before navigating
      if (isPlaying) {
        onTogglePlay(); // This should pause the video
      }
      
      // Check if it's the current user's profile
      if (currentUser?.uid === reel.uid) {
        // Navigate to own profile (account tab)
        navigation.navigate('MainTabs', { screen: 'account' });
      } else {
        // Navigate to other user's profile
        navigation.navigate('ProfileScreen', {
          userId: reel.uid,
          username: reel.username
        });
      }
    }
  }, [navigation, reel.uid, reel.username, currentUser?.uid, isPlaying, onTogglePlay]);

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      debouncedLike.cancel();
      debouncedSave.cancel();
    };
  }, [debouncedLike, debouncedSave]);

  return (
    <View style={[styles.container, { height: reelHeight }]}>
      {/* Video component with optimizations */}
      {reel.videoUrl && !hasError && (
        <Video
          ref={videoPlayerRef}
          source={{ uri: reel.streamData?.playbackUrl || reel.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={!isActive || !isPlaying}
          muted={isMuted}
          onLoad={handleVideoLoad}
          onError={handleVideoError}
          onBuffer={(e) => setIsBuffering(e.isBuffering)}
          onEnd={props.onVideoComplete}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          progressUpdateInterval={1000}
          // Optimized buffer config
          bufferConfig={{
            minBufferMs: 2500,
            maxBufferMs: 5000,
            bufferForPlaybackMs: 1000,
            bufferForPlaybackAfterRebufferMs: 2000,
          }}
          // Preload when needed
          poster={shouldPreload && !isActive ? reel.thumbnailUrl : undefined}
          posterResizeMode="cover"
        />
      )}

      {/* Thumbnail overlay while loading */}
      {(!videoReady || hasError) && reel.thumbnailUrl && (
        <Image
          source={{ uri: reel.thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}

      {/* Touch area */}
      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Bottom gradient - stronger for better visibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={styles.bottomOverlay}
      />

      {/* Top gradient for viewer count */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={styles.topOverlay}
      />

      {/* Report button - top right */}
      <TouchableOpacity 
        style={styles.reportButton}
        onPress={handleReport}
        activeOpacity={0.7}
      >
        <Ionicons name="alert-circle-outline" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Double tap like animation */}
      {doubleTapLikeAnimVisible && isActive && (
        <Animated.View
          style={[
            styles.heartContainer,
            {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }]
            }
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={80} color="#ff3366" />
        </Animated.View>
      )}

      {/* Buffering indicator */}
      {isBuffering && isActive && (
        <View style={styles.bufferingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Viewer count - top right */}
      {viewerCount > 0 && isActive && (
        <View style={styles.topRightContainer}>
          <View style={styles.liveViewersTop}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTextTop}>
              {viewerCount} watching
            </Text>
          </View>
        </View>
      )}

      {/* Bottom UI */}
      <View style={[styles.userInfoContainer, { bottom: safeBottomOffset }]}>
        <View style={styles.userContent}>
          {/* Profile section - now clickable */}
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8}>
            <Image
              source={{ uri: reel.profileImage || 'https://i.pravatar.cc/150?img=11' }}
              style={styles.profileImage}
            />
          </TouchableOpacity>

          {/* User info - also clickable */}
          <TouchableOpacity 
            style={styles.userInfoRight}
            onPress={handleProfilePress}
            activeOpacity={0.8}
          >
            <View style={styles.usernameRow}>
              <Text style={[
                styles.username,
                reel.user?.isVerified && styles.verifiedUsername
              ]} numberOfLines={1}>
                {reel.username || 'Anonymous'}
              </Text>
              {reel.user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </View>
              )}

              {reel.uid && !isOwnReel && (
                <FollowButton
                  targetUid={reel.uid}
                  username={reel.username}
                  size="small"
                  style={[
                    styles.followButtonOverride,
                    reel.user?.isVerified && styles.verifiedFollowButton
                  ]}
                />
              )}
            </View>
            <TouchableOpacity 
              onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              activeOpacity={0.7}
            >
              <Text 
                style={styles.soundText} 
                numberOfLines={isDescriptionExpanded ? undefined : 1}
              >
                {reel.title || 'Original audio'}
                {!isDescriptionExpanded && (reel.title?.length || 0) > 40 && '...'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Actions - removed menu and share buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
                <Ionicons
                  name={reel.isLiked ? "heart" : "heart-outline"}
                  size={26}
                  color={reel.isLiked ? "#ff3366" : "#fff"}
                />
              </Animated.View>
              <Text style={styles.actionCount}>
                {formatCount(reel.likesCount || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onComment}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#fff" />
              <Text style={styles.actionCount}>
                {formatCount(reel.commentsCount || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: saveScaleAnim }] }}>
                <Ionicons
                  name={reel.isSaved ? "bookmark" : "bookmark-outline"}
                  size={26}
                  color={reel.isSaved ? "#4285F4" : "#fff"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Enhanced memo comparison
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.doubleTapLikeAnimVisible === nextProps.doubleTapLikeAnimVisible &&
    prevProps.reel._id === nextProps.reel._id &&
    prevProps.reel.isLiked === nextProps.reel.isLiked &&
    prevProps.reel.isSaved === nextProps.reel.isSaved &&
    prevProps.reel.likesCount === nextProps.reel.likesCount &&
    prevProps.reel.commentsCount === nextProps.reel.commentsCount &&
    prevProps.reel.savesCount === nextProps.reel.savesCount &&
    prevProps.reel.views === nextProps.reel.views &&
    prevProps.viewerCount === nextProps.viewerCount &&
    prevProps.shouldPreload === nextProps.shouldPreload
  );
});

// Helper function
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  heartContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  reportButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 15,
    padding: 10,
    zIndex: 10,
  },
  topRightContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 15,
    zIndex: 10,
  },
  liveViewersTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveTextTop: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  userInfoContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    zIndex: 10, // Ensure it's above other elements
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Changed from 'center' to 'flex-end' to align items at bottom
  },
  profileImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333', // Add background color while loading
    bottom: 30, // Align with bottom of profile image

  },
  userInfoRight: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10, // Add margin to prevent touching icons
    bottom: 30, // Align with bottom of profile image
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 5,
    maxWidth: 120, // Reduced to prevent overlap
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  verifiedUsername: {
    color: '#FFD700', // Golden color for verified users
  },
  verifiedBadge: {
    backgroundColor: '#0066ff',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  followButtonOverride: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  verifiedFollowButton: {
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
    shadowColor: '#1DA1F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  soundText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap:7,
    width: 140, // Reduced width after removing share button
    bottom:30,
    marginLeft: 10,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 4,
  },
  actionCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3366',
  },
});

export default ReelItem;
// ProfileScreen.tsx - Fixed with Real-time Updates
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  RefreshControl,
  Easing,
  AppState,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { logout } from '../authService';
import AccountAnalyticsScreen from './AccountAnalyticsScreen';
import { checkFollowStatus, followUser, unfollowUser } from '../utils/social-utils';
import { useAppStore } from '../store/appStore';
import { useWebSocket, useWebSocketEvent } from '../services/WebSocketManager';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://aniflixx-backend.onrender.com/api';
const GRID_ITEM_SIZE = (width - 4) / 3;

interface UserProfile {
  _id?: string;
  uid: string;
  username: string;
  email?: string;
  bio?: string;
  profileImage?: string;
  displayName?: string;
  customStatus?: string;
  followers?: string[];
  following?: string[];
  savedReels?: string[];
  isVerified?: boolean;
  followersCount?: number;
  followingCount?: number;
}

interface ReelThumbnail {
  _id: string;
  thumbnailUrl: string;
  videoUrl?: string;
  likesCount: number;
  views: number;
  uid: string;
}

interface ProfileScreenProps {
  onLogout?: () => void;
  navigation?: any;
  route?: any;
  onNavigateToReels?: (reelId?: string, index?: number) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout, navigation, route, onNavigateToReels }) => {
  const currentUser = auth().currentUser;
  
  // Use globalUser directly for own profile
  const globalUser = useAppStore(state => state.user);
  const forceRefreshAll = useAppStore(state => state.forceRefreshAll);
  const updateUserStats = useAppStore(state => state.updateUserStats);
  
  // WebSocket context
  const { socket } = useWebSocket();
  
  // Check if viewing other profile
  const routeUserId = route?.params?.userId;
  const isViewingOtherProfile = routeUserId && routeUserId !== currentUser?.uid;
  const viewingUserId = routeUserId || currentUser?.uid;
  
  // State
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState<ReelThumbnail[]>([]);
  const [savedReels, setSavedReels] = useState<ReelThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'flicks' | 'saved'>('flicks');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [profileCacheTime, setProfileCacheTime] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(height)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const appState = useRef(AppState.currentState);
  const lastFetchTime = useRef(0);
  
  // Compute profile from either global state or other profile state
  const profile: UserProfile = React.useMemo(() => {
    if (!isViewingOtherProfile && globalUser) {
      return {
        _id: globalUser._id || '',
        uid: globalUser.uid || currentUser?.uid || '',
        username: globalUser.username || 'User',
        email: globalUser.email || currentUser?.email || '',
        bio: globalUser.bio || '',
        profileImage: globalUser.profileImage || 'https://aniflixx.com/default-user.jpg',
        displayName: globalUser.displayName || '',
        customStatus: globalUser.customStatus || '',
        followers: globalUser.followers || [],
        following: globalUser.following || [],
        savedReels: globalUser.savedReels || [],
        isVerified: globalUser.isVerified || false,
        followersCount: globalUser.followersCount || globalUser.followers?.length || 0,
        followingCount: globalUser.followingCount || globalUser.following?.length || 0,
      };
    }
    
    if (isViewingOtherProfile && otherProfile) {
      return otherProfile;
    }
    
    // Default profile while loading
    return {
      uid: viewingUserId || '',
      username: 'Loading...',
      profileImage: 'https://aniflixx.com/default-user.jpg',
      followersCount: 0,
      followingCount: 0,
    };
  }, [globalUser, otherProfile, isViewingOtherProfile, currentUser?.uid, viewingUserId]);

  // Subscribe to profile room for real-time updates
  useEffect(() => {
    if (socket?.connected && viewingUserId) {
      console.log(`Subscribing to profile updates for user: ${viewingUserId}`);
      socket.emit('profile:subscribe', { userId: viewingUserId });
      
      return () => {
        console.log(`Unsubscribing from profile updates for user: ${viewingUserId}`);
        socket.emit('profile:unsubscribe', { userId: viewingUserId });
      };
    }
  }, [socket, viewingUserId]);

  // Listen to WebSocket events for real-time updates
  useWebSocketEvent('profile:stats:update', (data: any) => {
    console.log('Received profile stats update:', data);
    
    if (data.userId === viewingUserId) {
      if (isViewingOtherProfile) {
        // Update other profile
        setOtherProfile(prev => prev ? {
          ...prev,
          followersCount: data.followersCount !== undefined ? data.followersCount : prev.followersCount,
          followingCount: data.followingCount !== undefined ? data.followingCount : prev.followingCount,
        } : null);
      } else {
        // Update own profile in global store
        updateUserStats({
          followersCount: data.followersCount,
          followingCount: data.followingCount,
        });
      }
    }
  });

  // Listen for follow/unfollow acknowledgments
  useWebSocketEvent('user:follow:ack', (data: any) => {
    // Update the target user's followers count
    if (data.targetUserId === viewingUserId && isViewingOtherProfile) {
      setIsFollowing(true);
      setOtherProfile(prev => prev ? {
        ...prev,
        followersCount: (prev.followersCount || 0) + 1
      } : null);
    }
    
    // Update current user's following count in global store
    if (data.userId === currentUser?.uid) {
      const currentFollowingCount = useAppStore.getState().user?.followingCount || 0;
      updateUserStats({
        followingCount: currentFollowingCount + 1
      });
    }
  });

  useWebSocketEvent('user:unfollow:ack', (data: any) => {
    // Update the target user's followers count
    if (data.targetUserId === viewingUserId && isViewingOtherProfile) {
      setIsFollowing(false);
      setOtherProfile(prev => prev ? {
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 1) - 1)
      } : null);
    }
    
    // Update current user's following count in global store
    if (data.userId === currentUser?.uid) {
      const currentFollowingCount = useAppStore.getState().user?.followingCount || 0;
      updateUserStats({
        followingCount: Math.max(0, currentFollowingCount - 1)
      });
    }
  });

  // Listen for saved reels updates
  useWebSocketEvent('reel:save:ack', (data: any) => {
    if (!isViewingOtherProfile) {
      // Refresh saved reels when a reel is saved/unsaved
      fetchSavedReelsData();
    }
  });

  // Subscribe to store changes for real-time updates
  useEffect(() => {
    if (!isViewingOtherProfile) {
      const unsubscribe = useAppStore.subscribe(
        (state) => state.user,
        (user) => {
          console.log('Global user updated in ProfileScreen:', user);
          
          // Refresh saved reels if they changed
          if (user?.savedReels) {
            fetchSavedReelsData();
          }
        }
      );
      
      return unsubscribe;
    }
  }, [isViewingOtherProfile]);

  // Force refresh on focus
  useFocusEffect(
    useCallback(() => {
      // Always fetch fresh data on focus, no cache check
      console.log('Screen focused, refreshing profile data');
      
      fetchReelsData();
      if (isViewingOtherProfile) {
        fetchProfileData(true);
      } else {
        fetchSavedReelsData();
        // Sync with backend to ensure counts are accurate
        syncProfileData();
      }
    }, [isViewingOtherProfile, viewingUserId])
  );

  // Sync profile data with backend
  const syncProfileData = async () => {
    try {
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        if (profileData.user) {
          // Update global store with fresh data
          useAppStore.getState().setUser(profileData.user);
        }
      }
    } catch (error) {
      console.error('Error syncing profile:', error);
    }
  };

  // App state change handler
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App came to foreground, refresh data
        console.log('App became active, refreshing data');
        handleRefresh();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);
  
  // Initial data fetch
  useEffect(() => {
    if (!viewingUserId) return;
    
    const now = Date.now();
    setProfileCacheTime(now);
    lastFetchTime.current = now;
    
    // Always fetch reels
    fetchReelsData();
    
    // For other profiles, show loading and fetch profile
    if (isViewingOtherProfile) {
      setLoading(true);
      fetchProfileData();
    } else {
      // For own profile, fetch saved reels and ensure profile is up to date
      fetchSavedReelsData();
      syncProfileData();
    }
  }, [viewingUserId]);

  const fetchProfileData = async (isRefresh = false) => {
    try {
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const profileUrl = `${API_BASE}/user/profile/${viewingUserId}`;

      const profileResponse = await fetch(profileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.user) {
          const fetchedProfile: UserProfile = {
            ...profileData.user,
            uid: profileData.user.uid || viewingUserId,
          };
          
          setOtherProfile(fetchedProfile);
          
          // Check follow status
          if (isViewingOtherProfile) {
            try {
              const followStatus = await checkFollowStatus(viewingUserId);
              setIsFollowing(followStatus);
            } catch (error) {
              console.error('Error checking follow status:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReelsData = async () => {
    try {
      if (!currentUser || !viewingUserId) return;
      
      const token = await currentUser.getIdToken();
      const reelsResponse = await fetch(
        `${API_BASE}/reels?limit=100&fresh=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (reelsResponse.ok) {
        const reelsData = await reelsResponse.json();
        if (reelsData.reels && Array.isArray(reelsData.reels)) {
          const userReels = reelsData.reels.filter((reel: any) =>
            reel.uid === viewingUserId
          );
          setReels(userReels);
        }
      }
    } catch (error) {
      console.error('Error fetching reels:', error);
    }
  };

  const fetchSavedReelsData = async () => {
    try {
      if (!currentUser || isViewingOtherProfile) return;
      
      const token = await currentUser.getIdToken();
      const reelsResponse = await fetch(
        `${API_BASE}/reels?limit=100&fresh=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (reelsResponse.ok) {
        const reelsData = await reelsResponse.json();
        if (reelsData.reels && Array.isArray(reelsData.reels)) {
          const savedReelIds = globalUser?.savedReels || profile?.savedReels || [];
          
          if (savedReelIds.length > 0) {
            const savedReelsList = reelsData.reels.filter((reel: any) =>
              savedReelIds.includes(reel._id)
            );
            setSavedReels(savedReelsList);
          } else {
            setSavedReels([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching saved reels:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    if (!viewingUserId || refreshing) return;
    setRefreshing(true);
    
    const now = Date.now();
    setProfileCacheTime(now);
    lastFetchTime.current = now;
    
    try {
      // Always fetch fresh data on manual refresh
      await fetchReelsData();
      
      if (isViewingOtherProfile) {
        await fetchProfileData(true);
      } else {
        await syncProfileData();
        await fetchSavedReelsData();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [viewingUserId, isViewingOtherProfile, refreshing]);

  const handleTabChange = (tab: 'flicks' | 'saved') => {
    if (tab !== activeTab) {
      Animated.spring(tabSlideAnim, {
        toValue: tab === 'saved' ? 1 : 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
      setActiveTab(tab);
      
      // Refresh data when switching tabs
      if (tab === 'saved' && !isViewingOtherProfile) {
        fetchSavedReelsData();
      }
    }
  };

  const handleFollowToggle = async () => {
    if (!profile?.uid || !currentUser) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow the user
        const result = await unfollowUser(profile.uid);
        
        // Update UI with response data
        setIsFollowing(false);
        
        // Update viewed profile's followers count from API response
        if (isViewingOtherProfile && otherProfile) {
          setOtherProfile(prev => prev ? {
            ...prev,
            followersCount: result.followersCount
          } : null);
        }
        
        // Update current user's following count from API response
        updateUserStats({
          followingCount: result.followingCount
        });
      } else {
        // Follow the user
        const result = await followUser(profile.uid);
        
        // Update UI with response data
        setIsFollowing(true);
        
        // Update viewed profile's followers count from API response
        if (isViewingOtherProfile && otherProfile) {
          setOtherProfile(prev => prev ? {
            ...prev,
            followersCount: result.followersCount
          } : null);
        }
        
        // Update current user's following count from API response
        updateUserStats({
          followingCount: result.followingCount
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      
      // Don't revert isFollowing state on error since the API might have succeeded
      // but returned an error status (like "Already following")
      
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const openAnalytics = () => {
    setAnalyticsVisible(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
    ]).start();
  };

  const closeAnalytics = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(modalTranslateY, {
        toValue: height,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setAnalyticsVisible(false);
      }, 50);
    });
  };

  const handleReelPress = useCallback((item: ReelThumbnail, index: number) => {
    console.log('Profile: Clicking on reel', item._id);
    
    const allReels = useAppStore.getState().reels;
    const globalIndex = allReels.findIndex((r: any) => r._id === item._id);
    
    const { isPlaying, togglePlay } = useAppStore.getState();
    if (isPlaying) {
      togglePlay();
    }
    
    if (navigation?.navigate) {
      const state = navigation.getState();
      const isFromSearch = state.routes.some((r: any) => r.name === 'UserSearch');
      
      if (isFromSearch) {
        navigation.popToTop();
      }
      
      navigation.navigate('MainTabs', {
        screen: 'flicks',
        params: {
          initialReelId: item._id,
          initialIndex: globalIndex >= 0 ? globalIndex : index
        }
      });
      
      if (onNavigateToReels) {
        setTimeout(() => {
          onNavigateToReels(item._id, globalIndex >= 0 ? globalIndex : index);
        }, 100);
      }
    }
  }, [onNavigateToReels, navigation]);

  const renderReelItem = useCallback(({ item, index }: { item: ReelThumbnail; index: number }) => (
    <TouchableOpacity
      onPress={() => handleReelPress(item, index)}
      style={styles.gridItem}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/150' }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
    </TouchableOpacity>
  ), [handleReelPress]);

  // Show loading only for other profiles
  if (loading && isViewingOtherProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={['#0066FF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {navigation?.canGoBack() && isViewingOtherProfile ? (
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => navigation?.navigate('UserSearch')}
                style={styles.searchButton}
              >
                <Ionicons name="search" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.headerCenter} />

          {!isViewingOtherProfile && (
            <View style={styles.headerRight}>
              <View style={styles.headerButtonsContainer}>
                <TouchableOpacity
                  onPress={openAnalytics}
                  style={styles.headerButton}
                >
                  <Ionicons name="bar-chart-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation?.navigate('AccountSettings')}
                  style={styles.headerButton}
                >
                  <Ionicons name="settings-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Profile Section */}
        <Animated.View
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Profile Image */}
          <View style={styles.profileImageWrapper}>
            <Image
              source={{ uri: profile.profileImage || 'https://aniflixx.com/default-user.jpg' }}
              style={styles.profileImage}
            />
          </View>

          {/* Username */}
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{profile.username}</Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color="#0066FF" style={styles.verifiedBadge} />
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {/* No navigation for flicks count */ }}
            >
              <Text style={styles.statLabel}>Flicks</Text>
              <Text style={styles.statValue}>{reels.length}</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowing', {
                userId: profile.uid,
                username: profile.username,
                initialTab: 'followers'
              })}
            >
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>
                {formatCount(profile.followersCount || profile.followers?.length || 0)}
              </Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersFollowing', {
                userId: profile.uid,
                username: profile.username,
                initialTab: 'following'
              })}
            >
              <Text style={styles.statLabel}>Following</Text>
              <Text style={styles.statValue}>
                {formatCount(profile.followingCount || profile.following?.length || 0)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {isViewingOtherProfile ? (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, isFollowing && styles.followingButton]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.primaryButtonText}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}>
                  <Ionicons name="chatbubble-outline" size={20} color="#999" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.tabButtonsContainer}>
                <View style={styles.tabButtonsBackground} />

                <Animated.View
                  style={[
                    styles.slidingBackground,
                    {
                      transform: [{
                        translateX: tabSlideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, (width - 40) * 0.5]
                        })
                      }]
                    }
                  ]}
                />

                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => handleTabChange('flicks')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="film"
                    size={20}
                    color="#fff"
                    style={activeTab === 'flicks' ? styles.activeButtonIcon : undefined}
                  />
                  {activeTab === 'flicks' && (
                    <Text style={styles.tabButtonText}>Flicks</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabButton}
                  onPress={() => handleTabChange('saved')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="bookmark"
                    size={20}
                    color="#fff"
                    style={activeTab === 'saved' ? styles.activeButtonIcon : undefined}
                  />
                  {activeTab === 'saved' && (
                    <Text style={styles.tabButtonText}>Saved</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={activeTab === 'flicks' ? reels : savedReels}
            renderItem={renderReelItem}
            keyExtractor={item => item._id}
            numColumns={3}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name={activeTab === 'flicks' ? 'film-outline' : 'bookmark-outline'}
                  size={64}
                  color="#333"
                />
                <Text style={styles.emptyStateText}>
                  {activeTab === 'flicks' ? 'No flicks yet' : 'No saved flicks'}
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Analytics Modal */}
      <Modal
        visible={analyticsVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeAnalytics}
      >
        <View style={styles.modalOuterContainer}>
          <TouchableWithoutFeedback onPress={closeAnalytics}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropOpacity }
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalContainer,
              { transform: [{ translateY: modalTranslateY }] }
            ]}
          >
            <AccountAnalyticsScreen
              onClose={closeAnalytics}
              profile={{
                username: profile.username || "User",
                profileImage: profile.profileImage || 'https://aniflixx.com/default-user.jpg',
                followersCount: profile.followersCount || profile.followers?.length || 0,
                isVerified: profile.isVerified || false,
                flicksCount: reels.length,
                followingCount: profile.followingCount || profile.following?.length || 0
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// Helper function
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0066FF',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerLeft: {
    width: 40,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerButton: {
    padding: 6,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#222',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066FF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  username: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 5,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 44,
    position: 'relative',
  },
  tabButtonsBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
  },
  slidingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#0066FF',
    borderRadius: 22,
    paddingRight: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  tabButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeButtonIcon: {
    marginRight: 0,
  },
  savedIconButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#0066FF',
  },
  activeSavedButton: {
    backgroundColor: '#0066FF',
  },
  followingButton: {
    backgroundColor: '#1A1A1A',
  },
  secondaryButton: {
    width: 50,
    height: 44,
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 1,
    paddingBottom: 80,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE * 1.5,
    padding: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  modalOuterContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.9,
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default ProfileScreen;
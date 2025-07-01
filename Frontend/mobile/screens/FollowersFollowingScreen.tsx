// screens/FollowersFollowingScreen.tsx - With Real-time Updates and Fixed Counts
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';
import { getFollowers, getFollowing, followUser, unfollowUser } from '../utils/social-utils';
import { useWebSocket } from '../services/WebSocketManager';

const { width } = Dimensions.get('window');

interface User {
  uid: string;
  username: string;
  profileImage: string;
  isVerified?: boolean;
  bio?: string;
  isFollowing?: boolean;
}

interface Props {
  navigation: any;
  route: {
    params: {
      userId: string;
      username: string;
      initialTab: 'followers' | 'following';
    };
  };
}

const FollowersFollowingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId, username, initialTab = 'followers' } = route.params;
  const currentUser = auth().currentUser;
  const isOwnProfile = currentUser?.uid === userId;
  
  const updateUserStats = useAppStore(state => state.updateUserStats);
  const { socket } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followersPage, setFollowersPage] = useState(0);
  const [followingPage, setFollowingPage] = useState(0);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  
  // Track if data has been loaded for each tab
  const dataLoaded = useRef({
    followers: false,
    following: false
  });

  // Load data only on mount for the initial tab
  useEffect(() => {
    loadData();
  }, []);

  // Load data when switching tabs only if not already loaded
  useEffect(() => {
    if (!dataLoaded.current[activeTab]) {
      loadData();
    }
  }, [activeTab]);

  const loadData = async (isRefresh = false) => {
    // Don't show loading spinner if we already have data
    if (!isRefresh && dataLoaded.current[activeTab]) {
      return;
    }
    
    if (!isRefresh) setLoading(true);
    
    try {
      if (activeTab === 'followers') {
        const page = isRefresh ? 0 : followersPage;
        const data = await getFollowers(userId, page);
        
        if (isRefresh) {
          setFollowers(data.followers || []);
          setFollowersPage(0);
        } else {
          setFollowers(prev => page === 0 ? (data.followers || []) : [...prev, ...(data.followers || [])]);
        }
        
        setHasMoreFollowers((data.followers || []).length === 20);
        dataLoaded.current.followers = true;
        
        // Check following status in parallel for better performance
        if (currentUser && data.followers.length > 0) {
          const followPromises = data.followers.map((user: User) => 
            checkIfFollowing(user.uid).then(isFollowing => ({
              uid: user.uid,
              isFollowing
            }))
          );
          
          const results = await Promise.all(followPromises);
          const states: Record<string, boolean> = {};
          results.forEach(({ uid, isFollowing }) => {
            states[uid] = isFollowing;
          });
          
          setFollowingStates(prev => ({ ...prev, ...states }));
        }
      } else {
        const page = isRefresh ? 0 : followingPage;
        const data = await getFollowing(userId, page);
        
        if (isRefresh) {
          setFollowing(data.following || []);
          setFollowingPage(0);
        } else {
          setFollowing(prev => page === 0 ? (data.following || []) : [...prev, ...(data.following || [])]);
        }
        
        setHasMoreFollowing((data.following || []).length === 20);
        dataLoaded.current.following = true;
        
        // Check following status in parallel
        if (currentUser && data.following.length > 0) {
          const followPromises = data.following.map((user: User) => 
            checkIfFollowing(user.uid).then(isFollowing => ({
              uid: user.uid,
              isFollowing
            }))
          );
          
          const results = await Promise.all(followPromises);
          const states: Record<string, boolean> = {};
          results.forEach(({ uid, isFollowing }) => {
            states[uid] = isFollowing;
          });
          
          setFollowingStates(prev => ({ ...prev, ...states }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkIfFollowing = async (targetUid: string): Promise<boolean> => {
    if (targetUid === currentUser?.uid) return false;
    
    try {
      const response = await fetch(
        `https://aniflixx-backend.onrender.com/api/social/check/${targetUid}`,
        {
          headers: {
            'Authorization': `Bearer ${await currentUser?.getIdToken()}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.following;
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
    
    return false;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Force reload current tab data
    dataLoaded.current[activeTab] = false;
    loadData(true);
  };

  const handleLoadMore = () => {
    const hasMore = activeTab === 'followers' ? hasMoreFollowers : hasMoreFollowing;
    
    if (!loading && hasMore) {
      if (activeTab === 'followers') {
        setFollowersPage(prev => prev + 1);
      } else {
        setFollowingPage(prev => prev + 1);
      }
      loadData();
    }
  };

  const handleFollowToggle = async (user: User) => {
    const isFollowing = followingStates[user.uid];
    
    // Optimistic update
    setFollowingStates(prev => ({ ...prev, [user.uid]: !isFollowing }));
    
    try {
      if (isFollowing) {
        const result = await unfollowUser(user.uid);
        
        // Update current user's following count from API response
        updateUserStats({
          followingCount: result.followingCount
        });
        
        // If viewing own profile and unfollowing from following tab, remove from list
        if (isOwnProfile && activeTab === 'following') {
          setFollowing(prev => prev.filter(u => u.uid !== user.uid));
        }
      } else {
        const result = await followUser(user.uid);
        
        // Update current user's following count from API response
        updateUserStats({
          followingCount: result.followingCount
        });
      }
    } catch (error) {
      // Revert on error
      setFollowingStates(prev => ({ ...prev, [user.uid]: isFollowing }));
      console.error('Error toggling follow:', error);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isCurrentUser = item.uid === currentUser?.uid;
    const isFollowing = followingStates[item.uid];
    const followStateKnown = item.uid in followingStates;
    
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.push('ProfileScreen', { userId: item.uid })}
      >
        <Image source={{ uri: item.profileImage }} style={styles.profileImage} />
        
        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{item.username}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#0066FF" style={styles.verifiedBadge} />
            )}
          </View>
          {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
        </View>
        
        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton, 
              !followStateKnown && styles.followButtonSkeleton,
              isFollowing && followStateKnown && styles.followingButton
            ]}
            onPress={() => handleFollowToggle(item)}
            disabled={!followStateKnown}
          >
            {!followStateKnown ? (
              <View style={styles.skeletonContent} />
            ) : (
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {activeTab === 'followers' 
            ? `${isOwnProfile ? "You don't" : `${username} doesn't`} have any followers yet`
            : `${isOwnProfile ? "You're not" : `${username} isn't`} following anyone yet`
          }
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    const page = activeTab === 'followers' ? followersPage : followingPage;
    if (!loading || page === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  };

  const data = activeTab === 'followers' ? followers : following;
  const shouldShowLoading = loading && !dataLoaded.current[activeTab];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{username}</Text>
        <View style={styles.backButton} />
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
            Followers
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>
      
      {shouldShowLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderUser}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0066FF"
              colors={['#0066FF']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066FF',
  },
  tabText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 5,
  },
  bio: {
    color: '#999',
    fontSize: 14,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#0066FF',
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#fff',
  },
  followButtonSkeleton: {
    backgroundColor: '#1A1A1A',
    opacity: 0.6,
  },
  skeletonContent: {
    width: 60,
    height: 14,
    backgroundColor: '#333',
    borderRadius: 7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

export default FollowersFollowingScreen;
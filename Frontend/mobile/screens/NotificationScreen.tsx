// screens/NotificationScreen.tsx - Debug version
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reply' | 'comment_like';
  from: {
    userId: string;
    username: string;
    profileImage?: string;
  };
  reelId?: string;
  reelTitle?: string;
  comment?: string;
  timestamp: Date | string;
  isRead?: boolean;
  thumbnailUrl?: string;
}

// Simple time formatter
const formatTimeAgo = (timestamp: Date | string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (isNaN(seconds)) return 'unknown time';
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'unknown time';
  }
};

interface NotificationScreenProps {
  navigation: any;
  onNavigateToReels?: (reelId?: string) => void;
}

const NotificationScreen: React.FC<NotificationScreenProps> = ({ navigation, onNavigateToReels }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Store
  const socket = useAppStore(state => state.socket);
  const connected = useAppStore(state => state.connected);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const notificationAnims = useRef<Animated.Value[]>([]).current;

  // Initialize animation values
  useEffect(() => {
    for (let i = 0; i < 20; i++) {
      if (!notificationAnims[i]) {
        notificationAnims[i] = new Animated.Value(0);
      }
    }
  }, []);

  // Fetch notifications with enhanced debugging
  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      
      const user = auth().currentUser;
      if (!user) {
        console.log('❌ No authenticated user in NotificationScreen');
        setDebugInfo('No authenticated user');
        return;
      }
      
      console.log('📬 Fetching notifications for user:', user.uid);
      
      const token = await user.getIdToken();
      const currentPage = isRefresh ? 1 : page;
      
      const response = await fetch(
        `${API_BASE}/notifications?page=${currentPage}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('📬 Notifications API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📬 Raw API response:', JSON.stringify(data, null, 2));
        
        // Log the structure of the first notification if available
        if (data.notifications && data.notifications.length > 0) {
          console.log('📬 First notification structure:', JSON.stringify(data.notifications[0], null, 2));
          console.log('📬 Notification keys:', Object.keys(data.notifications[0]));
        }
        
        setDebugInfo(`Received ${data.notifications?.length || 0} notifications from API`);
        
        if (isRefresh) {
          setNotifications(data.notifications || []);
          setPage(1);
        } else {
          setNotifications(prev => [...prev, ...(data.notifications || [])]);
        }
        
        setHasMore(data.pagination?.hasMore || false);
        
        // Animate notifications in
        animateNotificationsIn();
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch notifications:', response.status, errorText);
        setDebugInfo(`API Error: ${response.status}`);
      }
    } catch (error:any) {
      console.error('❌ Error fetching notifications:', error);
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchNotifications();
    
    // Page opening animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const animateNotificationsIn = () => {
    const animations = notificationAnims.slice(0, Math.min(notifications.length, 20)).map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * 50),
        Animated.spring(anim, {
          toValue: 1,
          tension: 35,
          friction: 6,
          useNativeDriver: true,
        }),
      ]);
    });
    
    Animated.parallel(animations).start();
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    notificationAnims.forEach(anim => anim.setValue(0));
    fetchNotifications(true);
  }, []);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    console.log('📱 Notification pressed:', notification);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'follow':
        navigation.navigate('Profile', { userId: notification.from.userId });
        break;
      case 'like':
      case 'comment':
      case 'mention':
      case 'reply':
      case 'comment_like':
        if (notification.reelId) {
          navigation.goBack();
          setTimeout(() => {
            if (onNavigateToReels) {
              onNavigateToReels(notification.reelId);
            }
          }, 100);
        }
        break;
    }
  }, [navigation, onNavigateToReels]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return { name: 'heart', color: '#FF3B5F' };
      case 'comment':
      case 'reply':
        return { name: 'chatbubble', color: '#4285F4' };
      case 'follow':
        return { name: 'person-add', color: '#00D8FF' };
      case 'mention':
        return { name: 'at', color: '#FFD700' };
      case 'comment_like':
        return { name: 'heart', color: '#FF69B4' };
      default:
        return { name: 'notifications', color: '#666' };
    }
  };

  const getNotificationText = (notification: Notification) => {
    const username = notification.from?.username || 'Unknown User';
    switch (notification.type) {
      case 'like':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> liked your flick
        </Text>;
      case 'comment':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> commented: "{notification.comment || 'No comment text'}"
        </Text>;
      case 'follow':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> started following you
        </Text>;
      case 'mention':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> mentioned you in a comment
        </Text>;
      case 'reply':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> replied to your comment: "{notification.comment || 'No reply text'}"
        </Text>;
      case 'comment_like':
        return <Text style={styles.notificationText}>
          <Text style={styles.username}>{username}</Text> liked your comment
        </Text>;
      default:
        return <Text style={styles.notificationText}>New notification from {username}</Text>;
    }
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => {
    console.log(`🔍 Rendering notification ${index}:`, JSON.stringify(item, null, 2));
    
    // Safety checks
    if (!item || !item._id) {
      console.error('❌ Invalid notification item:', item);
      return null;
    }
    
    const icon = getNotificationIcon(item.type);
    const scale = notificationAnims[Math.min(index, 19)] || new Animated.Value(1);
    const opacity = notificationAnims[Math.min(index, 19)] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={[
          styles.notificationWrapper,
          {
            opacity: opacity,
            transform: [
              {
                scale: scale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
              {
                translateX: scale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.isRead && styles.unreadNotification
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          {/* Profile Image */}
          <View style={styles.leftSection}>
            <Image
              source={{ 
                uri: item.from?.profileImage || 'https://aniflixx.com/default-user.jpg' 
              }}
              style={styles.profileImage}
              onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
            />
            <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
              <Ionicons name={icon.name} size={14} color="#fff" />
            </View>
          </View>
          
          {/* Content */}
          <View style={styles.contentSection}>
            {getNotificationText(item)}
            <Text style={styles.timeText}>
              {formatTimeAgo(item.timestamp)}
            </Text>
          </View>
          
          {/* Thumbnail if available */}
          {item.thumbnailUrl && (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumbnail}
              onError={(e) => console.log('Thumbnail load error:', e.nativeEvent.error)}
            />
          )}
          
          {/* Unread indicator */}
          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={80} color="#333" />
      </View>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptyText}>
        When someone interacts with your content, you'll see it here
      </Text>
      <Text style={styles.debugText}>Debug: {debugInfo}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4285F4" />
      </View>
    );
  };

  // Debug render to check notification data
  console.log('🎨 Rendering NotificationScreen with:', {
    notificationsCount: notifications.length,
    loading,
    connected,
    hasSocket: !!socket
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Debug info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Debug: {notifications.length} notifications | Loading: {loading ? 'Yes' : 'No'} | {debugInfo}
        </Text>
      </View>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications ({notifications.length})</Text>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="settings-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Gradient separator */}
      <LinearGradient
        colors={['rgba(66, 133, 244, 0.3)', 'transparent']}
        style={styles.headerGradient}
      />
      
      {/* Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length > 0 ? (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item._id || `notif_${Math.random()}`}
            contentContainerStyle={styles.listContent}
            onEndReached={() => hasMore && !loading && fetchNotifications()}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#4285F4"
                colors={['#4285F4']}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderFooter}
            // Debug props
            onLayout={() => console.log('FlatList layout complete')}
            ListEmptyComponent={() => <Text style={styles.debugText}>FlatList is rendering but no items</Text>}
          />
        ) : (
          renderEmpty()
        )}
        
        {/* Debug: Show raw notification data */}
        {__DEV__ && notifications.length > 0 && (
          <ScrollView style={styles.debugScrollView}>
            <Text style={styles.debugTitle}>Raw Notification Data (First Item):</Text>
            <Text style={styles.debugJson}>
              {JSON.stringify(notifications[0], null, 2)}
            </Text>
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  debugContainer: {
    backgroundColor: '#222',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  debugText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  debugScrollView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: '#111',
    padding: 10,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugJson: {
    color: '#0f0',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  loadingText: {
    color: '#666',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: Platform.OS === 'ios' ? 'flex-start' : 'center',
  },
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 17 : 20,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: '#fff',
    letterSpacing: Platform.OS === 'android' ? 0.15 : 0,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: Platform.OS === 'ios' ? 'flex-end' : 'center',
  },
  headerGradient: {
    height: 1,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationWrapper: {
    paddingHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingVertical: Platform.OS === 'ios' ? 14 : 16,
    paddingHorizontal: 16,
    borderRadius: Platform.OS === 'ios' ? 12 : 8,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#111',
  },
  leftSection: {
    position: 'relative',
    marginRight: 12,
  },
  profileImage: {
    width: Platform.OS === 'ios' ? 44 : 48,
    height: Platform.OS === 'ios' ? 44 : 48,
    borderRadius: Platform.OS === 'ios' ? 22 : 24,
    backgroundColor: '#222',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  contentSection: {
    flex: 1,
    marginRight: 12,
  },
  notificationText: {
    color: '#ccc',
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    lineHeight: Platform.OS === 'ios' ? 20 : 21,
  },
  username: {
    color: '#fff',
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
  },
  timeText: {
    color: '#666',
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    marginTop: 4,
  },
  thumbnail: {
    width: Platform.OS === 'ios' ? 44 : 48,
    height: Platform.OS === 'ios' ? 44 : 48,
    borderRadius: Platform.OS === 'ios' ? 8 : 6,
    backgroundColor: '#222',
  },
  unreadDot: {
    position: 'absolute',
    left: Platform.OS === 'ios' ? 6 : 4,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyList: {
    flex: 1,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: Platform.OS === 'ios' ? 20 : 22,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default NotificationScreen;
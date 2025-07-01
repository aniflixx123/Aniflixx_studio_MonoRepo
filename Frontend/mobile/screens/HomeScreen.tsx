import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Platform,
  StyleSheet,
  View,
  Text,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import Logo from "../assets/images/logo1.png";
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const BannerVideo = require('../assets/banner.mp4');
const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface TrendingFlick {
  _id: string;
  thumbnailUrl: string;
  title?: string;
  likesCount: number;
  views: number;
  duration?: string;
}

const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

export default function HomeScreen({ navigation, onNavigateToReels }: { navigation?: any; onNavigateToReels?: (reelId?: string) => void }) {
  const [trendingFlicks, setTrendingFlicks] = useState<TrendingFlick[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const currentUser = auth().currentUser;

  const { unreadCount, clearBadge } = useNotificationBadge();

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const flickAnimations = useRef<Animated.Value[]>([]).current;

  // Page opening animations
  const bannerScale = useRef(new Animated.Value(0.95)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const notificationScale = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const appState = useRef(AppState.currentState);

  // Initialize animation values for flicks
  useEffect(() => {
    for (let i = 0; i < 10; i++) {
      if (!flickAnimations[i]) {
        flickAnimations[i] = new Animated.Value(0);
      }
    }
  }, []);

  // Handle app state changes for video
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        setVideoPaused(true);
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setVideoPaused(false);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Pause video when screen loses focus
  useFocusEffect(
    useCallback(() => {
      setVideoPaused(false);
      return () => {
        setVideoPaused(true);
      };
    }, [])
  );

  // Page opening animation - smoother and faster
  useEffect(() => {
    // Reset all animations
    bannerOpacity.setValue(0);
    bannerScale.setValue(0.95);
    logoScale.setValue(0);
    notificationScale.setValue(0);
    headerSlide.setValue(-20);

    // Start animations immediately
    Animated.parallel([
      // Banner fade in and scale
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(bannerScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      // Header elements
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(headerSlide, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(100),
            Animated.spring(notificationScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
    ]).start();

    return () => {
      setVideoPaused(true);
    };
  }, []);

  const fetchTrendingFlicks = async () => {
    try {
      setLoading(true);

      if (!currentUser) {
        console.error('No authenticated user');
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/reels`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const allFlicks = data.reels || [];
        const trending = allFlicks.slice(0, Math.min(10, allFlicks.length));
        setTrendingFlicks(trending);
        animateFlicksIn();
      }
    } catch (err) {
      console.error('Error fetching trending flicks:', err);
    } finally {
      setLoading(false);
    }
  };

  const animateFlicksIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    flickAnimations.forEach(anim => anim.setValue(0));

    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const animations = flickAnimations.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(600 + index * 80),
        Animated.spring(anim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start();
  };

  useEffect(() => {
    if (currentUser) {
      fetchTrendingFlicks();
    }
  }, [currentUser]);

  const handleFlickPress = (flickId: string, flickIndex: number) => {
    if (onNavigateToReels) {
      onNavigateToReels(flickId);
    } else if (navigation?.navigate) {
      navigation.navigate('Reels', {
        initialReelId: flickId,
        initialIndex: flickIndex
      });
    }
  };

  const handleViewAll = () => {
    if (onNavigateToReels) {
      onNavigateToReels();
    } else if (navigation?.navigate) {
      navigation.navigate('Reels');
    }
  };

  const handleNotificationPress = () => {
    clearBadge();
    if (navigation?.navigate) {
      navigation.navigate('Notifications');
    }
  };

  const renderFlickItem = ({ item, index }: { item: TrendingFlick; index: number }) => {
    const scale = flickAnimations[index] || new Animated.Value(0);
    const opacity = flickAnimations[index] || new Animated.Value(0);

    return (
      <Animated.View
        style={{
          transform: [
            {
              scale: scale.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
            {
              translateY: scale.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
          opacity,
        }}
      >
        <TouchableOpacity
          style={styles.flickCard}
          onPress={() => handleFlickPress(item._id, index)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.flickThumbnail}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.flickGradient}
          />
          {item.title && (
            <Text style={styles.flickTitle} numberOfLines={1}>
              {item.title}
            </Text>
          )}
          <View style={styles.flickStats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#fff" />
              <Text style={styles.statText}>{formatCount(item.likesCount)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.statText}>{formatCount(item.views)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.bannerWrapper,
              {
                opacity: bannerOpacity,
                transform: [{ scale: bannerScale }]
              }
            ]}
          >
            <View style={styles.banner}>
              <Video
                source={BannerVideo}
                style={styles.videoBackground}
                resizeMode="cover"
                repeat
                muted={true}
                paused={videoPaused}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                onError={(error) => {
                  console.log('Banner video error:', error);
                }}
                useTextureView={false}
                disableFocus={true}
              />

              <Animated.View style={[
                styles.headerRow,
                {
                  transform: [{ translateY: headerSlide }]
                }
              ]}>
                <Animated.Image
                  source={Logo}
                  style={[
                    styles.logo,
                    {
                      transform: [{ scale: logoScale }]
                    }
                  ]}
                  resizeMode="contain"
                />

                <Animated.View
                  style={{
                    transform: [{ scale: notificationScale }]
                  }}
                >
                  <TouchableOpacity 
                    style={styles.notificationButton} 
                    onPress={handleNotificationPress}
                  >
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.95)']}
                style={styles.bottomGradient}
              />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.trendingSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.trendingHeader}>
              <Text style={styles.trendingTitle}>Trending Flicks</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAll}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285F4" />
              </View>
            ) : trendingFlicks.length > 0 ? (
              <FlatList
                data={trendingFlicks}
                renderItem={renderFlickItem}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.flicksList}
                decelerationRate="fast"
                snapToInterval={width * 0.35 + 12}
                snapToAlignment="start"
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="film-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No flicks available yet</Text>
              </View>
            )}
          </Animated.View>

          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  bannerWrapper: {
    backgroundColor: '#000',
  },
  banner: {
    width,
    height: width * 0.85,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  headerRow: {
    zIndex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 10,
    paddingBottom: 10,
  },
  logo: {
    width: 48,
    height: 48,
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    zIndex: 1,
  },
  trendingSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  trendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  flicksList: {
    paddingRight: 16,
  },
  flickCard: {
    width: width * 0.35,
    height: width * 0.5,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  flickThumbnail: {
    width: '100%',
    height: '100%',
  },
  flickGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  flickTitle: {
    position: 'absolute',
    bottom: 40,
    left: 8,
    right: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  flickStats: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    height: width * 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    width: width - 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
});
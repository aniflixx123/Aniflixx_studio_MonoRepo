import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  LogBox,
  StatusBar,
  Platform,
  BackHandler,
  Alert,
  Animated,
  Easing,
  Keyboard,
  Dimensions,
} from "react-native";
import auth from "@react-native-firebase/auth";
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import mobileAds from 'react-native-google-mobile-ads';

// Auth Service
import { loadUserProfile, logout, clearUserProfile, saveUserProfile } from "./authService";

// Global State & WebSocket
import { useAppStore } from "./store/appStore";
import { WebSocketManager } from "./services/WebSocketManager";

// Screens
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import AccountSettingsScreen from "./screens/AccountSettingsScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import ReelsComponent, { ReelsComponentHandle } from "./screens/ReelsComponent";
import BottomNavBar from "./components/BottomNavBar";
import StoreScreen from "./screens/StoreScreen";
import UploadFlickScreen from "./screens/UploadScreen";
import NotificationScreen from './screens/NotificationScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import FollowersFollowingScreen from "./screens/FollowersFollowingScreen";
import UserSearchScreen from "./screens/UserSearchScreen";

// Firebase auto-initializes with React Native Firebase when GoogleService-Info.plist is present
console.log('🔥 Firebase module imported - auto-initialization triggered');

// Consolidated LogBox configuration
LogBox.ignoreLogs([
  "Setting a timer",
  'Sending `onAnimatedValueUpdate`',
  'Non-serializable values were found in the navigation state',
  'React Native Firebase namespace API is deprecated',
  'All React Native Firebase namespace',
  '@firebase/auth:',
  'AsyncStorage has been extracted',
]);

const Stack = createStackNavigator();

// Get device dimensions
const windowHeight = Dimensions.get('window').height;
const windowWidth = Dimensions.get('window').width;
const isSmallAndroidDevice = Platform.OS === 'android' && windowHeight < 700;

// Custom dark theme to prevent white flashes
const CustomDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4285F4',
    background: '#000000',
    card: '#000000',
    text: '#ffffff',
    border: '#222222',
    notification: '#4285F4',
  },
};

const AuthNavigator = ({ onLogin }: { onLogin: (user: any) => void }) => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000' },
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: Platform.OS === 'ios' 
            ? {
                animation: 'spring' as const,
                config: {
                  stiffness: 1000,
                  damping: 500,
                  mass: 3,
                  overshootClamping: true,
                  restDisplacementThreshold: 0.01,
                  restSpeedThreshold: 0.01,
                },
              }
            : {
                animation: 'timing' as const,
                config: {
                  duration: 250,
                  easing: Easing.out(Easing.poly(5)),
                },
              },
          close: Platform.OS === 'ios'
            ? {
                animation: 'spring' as const,
                config: {
                  stiffness: 1000,
                  damping: 500,
                  mass: 3,
                  overshootClamping: true,
                  restDisplacementThreshold: 0.01,
                  restSpeedThreshold: 0.01,
                },
              }
            : {
                animation: 'timing' as const,
                config: {
                  duration: 250,
                  easing: Easing.in(Easing.poly(5)),
                },
              },
        },
      }}
    >
      <Stack.Screen name="Login">
        {props => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen name="Signup">
        {props => <SignupScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

interface MainAppProps {
  user: any;
  onLogout: () => Promise<void>;
}

interface ReelsNavigationParams {
  initialReelId?: string;
  initialIndex?: number;
}

const MainAppContent = ({ user, onLogout }: MainAppProps) => {
  const [activeTab, setActiveTab] = useState("home");
  const [prevTab, setPrevTab] = useState("home");
  const [reelsNavigationParams, setReelsNavigationParams] = useState<ReelsNavigationParams>({});
  const reelsComponentRef = useRef<ReelsComponentHandle>(null);
  const flixTabLoaded = useRef(false);
  
  // State to control navbar visibility
  const [showBottomNavBar, setShowBottomNavBar] = useState(true);
  
  // Keyboard state for Android
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation values for tab transitions
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  // Navigation control refs to prevent rapid navigation
  const isNavigating = useRef(false);
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationTime = useRef(0);
  const pendingNavigation = useRef<{ reelId?: string; index?: number } | null>(null);

  // Keyboard listeners for Android navbar handling
  useEffect(() => {
    let keyboardWillShow: any;
    let keyboardWillHide: any;
    
    if (Platform.OS === 'android') {
      // Android keyboard events
      keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        console.log('⌨️ Android keyboard shown');
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      });
      
      keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        console.log('⌨️ Android keyboard hidden');
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      });
    } else {
      // iOS keyboard events (smoother with Will events)
      keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      });
      
      keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      });
    }
    
    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === "flicks" && reelsComponentRef.current) {
        reelsComponentRef.current.pauseAllVideos();
      }
      return false;
    });
    return () => backHandler.remove();
  }, [activeTab]);

  // Optimized tab change effect
  useEffect(() => {
    // Skip if same tab
    if (prevTab === activeTab) return;

    if (prevTab === "flicks" && activeTab !== "flicks") {
      if (reelsComponentRef.current) {
        try {
          reelsComponentRef.current.pauseAllVideos();
        } catch (e) {
          console.error("Error pausing videos:", e);
        }
      }
    }
    else if (activeTab === "flicks" && prevTab !== "flicks") {
      flixTabLoaded.current = true;
      
      // Check for pending navigation after tab change
      if (pendingNavigation.current) {
        const { reelId, index } = pendingNavigation.current;
        pendingNavigation.current = null;
        
        // Delay to ensure component is ready
        setTimeout(() => {
          if (reelsComponentRef.current && reelId) {
            const allReels = useAppStore.getState().reels;
            const targetIndex = allReels.findIndex(r => r._id === reelId);
            if (targetIndex >= 0) {
              reelsComponentRef.current.scrollToReel(targetIndex);
            }
          }
        }, 500);
      } else {
        // Normal resume playback
        const timer = setTimeout(() => {
          if (reelsComponentRef.current && activeTab === "flicks") {
            try {
              reelsComponentRef.current.resumePlayback();
            } catch (e) {
              console.error("Error resuming playback:", e);
            }
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    
    setPrevTab(activeTab);
  }, [activeTab, prevTab]);

  const animateTabChange = useCallback((newTab: string) => {
    const fadeOutDuration = Platform.OS === 'ios' ? 150 : 100;
    const fadeInDuration = Platform.OS === 'ios' ? 200 : 150;

    // Pause videos immediately if leaving flicks
    if (activeTab === "flicks" && newTab !== "flicks" && reelsComponentRef.current) {
      try {
        reelsComponentRef.current.pauseAllVideos();
      } catch (e) {
        console.error("Error pausing videos during tab change:", e);
      }
    }

    Animated.parallel([
      Animated.timing(tabFadeAnim, {
        toValue: 0,
        duration: fadeOutDuration,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(tabSlideAnim, {
        toValue: -20,
        duration: fadeOutDuration,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start(() => {
      setActiveTab(newTab);
      tabSlideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: fadeInDuration,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(tabSlideAnim, {
          toValue: 0,
          duration: fadeInDuration,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    });
  }, [activeTab, tabFadeAnim, tabSlideAnim]);

  // Optimized navigation handler with debouncing
  const handleNavigateToReels = useCallback((reelId?: string, index?: number) => {
    console.log('Navigating to reels, reelId:', reelId, 'index:', index);

    // Prevent rapid navigation
    const now = Date.now();
    if (now - lastNavigationTime.current < 500) {
      console.log('Navigation throttled');
      return;
    }
    lastNavigationTime.current = now;

    // Clear any pending navigation timeout
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
    }

    // If already navigating, queue this navigation
    if (isNavigating.current) {
      pendingNavigation.current = { reelId, index };
      return;
    }

    isNavigating.current = true;

    // Update navigation params
    setReelsNavigationParams({
      initialReelId: reelId,
      initialIndex: index
    });

    // If already on flicks tab
    if (activeTab === "flicks") {
      // Small delay to ensure smooth scrolling
      navigationTimeout.current = setTimeout(() => {
        if (reelsComponentRef.current && reelId) {
          const allReels = useAppStore.getState().reels;
          const targetIndex = allReels.findIndex(r => r._id === reelId);
          if (targetIndex >= 0) {
            reelsComponentRef.current.scrollToReel(targetIndex);
          }
        }
        isNavigating.current = false;
      }, 100);
    } else {
      // Store pending navigation for after tab change
      pendingNavigation.current = { reelId, index };
      
      // Change to flicks tab
      animateTabChange("flicks");
      
      // Reset navigation state after animation
      navigationTimeout.current = setTimeout(() => {
        isNavigating.current = false;
      }, 600);
    }
  }, [activeTab, animateTabChange]);

  const handleTabChange = useCallback((newTab: string) => {
    // Dismiss keyboard when changing tabs
    if (Platform.OS === 'android' && keyboardVisible) {
      Keyboard.dismiss();
    }
    
    // Prevent rapid tab changes
    const now = Date.now();
    if (now - lastNavigationTime.current < 300) {
      return;
    }
    lastNavigationTime.current = now;

    if (activeTab !== newTab) {
      if (newTab === "flicks") {
        setReelsNavigationParams({});
      }
      animateTabChange(newTab);
    }
  }, [activeTab, animateTabChange, keyboardVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
    };
  }, []);

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <SafeAreaView 
        style={styles.container} 
        edges={['top', Platform.OS === 'ios' ? 'bottom' : 'left']}
      >
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#000000"
          translucent={Platform.OS === 'android'}
        />

        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#000' },
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            presentation: 'card',
            transitionSpec: {
              open: Platform.OS === 'ios'
                ? {
                    animation: 'spring' as const,
                    config: {
                      stiffness: 1000,
                      damping: 500,
                      mass: 3,
                      overshootClamping: true,
                      restDisplacementThreshold: 0.01,
                      restSpeedThreshold: 0.01,
                    },
                  }
                : {
                    animation: 'timing' as const,
                    config: {
                      duration: 250,
                      easing: Easing.out(Easing.poly(5)),
                    },
                  },
              close: Platform.OS === 'ios'
                ? {
                    animation: 'spring' as const,
                    config: {
                      stiffness: 1000,
                      damping: 500,
                      mass: 3,
                      overshootClamping: true,
                      restDisplacementThreshold: 0.01,
                      restSpeedThreshold: 0.01,
                    },
                  }
                : {
                    animation: 'timing' as const,
                    config: {
                      duration: 250,
                      easing: Easing.in(Easing.poly(5)),
                    },
                  },
            },
          }}
        >
          <Stack.Screen name="MainTabs">
            {(props) => (
              <View style={[
                styles.tabContainer,
                isSmallAndroidDevice && keyboardVisible && styles.smallDeviceKeyboard
              ]}>
                <Animated.View
                  style={[
                    styles.screenWrapper,
                    {
                      opacity: tabFadeAnim,
                      transform: [{ translateY: tabSlideAnim }],
                    }
                  ]}
                >
                  {activeTab === "home" && (
                    <HomeScreen
                      {...props}
                      onNavigateToReels={handleNavigateToReels}
                    />
                  )}
                  {activeTab === "flicks" && (
                    <ReelsComponent
                      isActive={activeTab === "flicks"}
                      ref={reelsComponentRef}
                      {...reelsNavigationParams}
                    />
                  )}
                  {activeTab === "upload" && (
                    <UploadFlickScreen 
                      {...props} 
                      route={{ 
                        ...props.route, 
                        params: { 
                          setShowBottomNavBar,
                          onNavigateToReels: handleNavigateToReels,
                          onChangeTab: handleTabChange,
                          keyboardHeight: keyboardHeight,
                          isSmallDevice: isSmallAndroidDevice
                        } 
                      }}
                    />
                  )}

                  {activeTab === "account" && (
                    <ProfileScreen
                      {...props}
                      onLogout={onLogout}
                      onNavigateToReels={handleNavigateToReels}
                    />
                  )}
                </Animated.View>
                
                {/* Hide navbar on Android when keyboard is visible */}
                {showBottomNavBar && (!keyboardVisible || Platform.OS === 'ios') && (
                  <BottomNavBar 
                    activeTab={activeTab} 
                    onChangeTab={handleTabChange} 
                    profileImage={user?.profileImage}
                  />
                )}
              </View>
            )}
          </Stack.Screen>
          
          <Stack.Screen
            name="ProfileScreen"
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {(props) => (
              <ProfileScreen 
                {...props} 
                onLogout={onLogout}
                onNavigateToReels={handleNavigateToReels}
              />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="UserSearch"
            component={UserSearchScreen}
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          
          <Stack.Screen
            name="FollowersFollowing"
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {(props) => <FollowersFollowingScreen {...props as any} />}
          </Stack.Screen>
          
          <Stack.Screen
            name="AccountSettings"
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {(props) => <AccountSettingsScreen {...props} onLogout={onLogout} />}
          </Stack.Screen>

          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
          
          <Stack.Screen
            name="Notifications"
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {(props) => <NotificationScreen {...props} onNavigateToReels={handleNavigateToReels} />}
          </Stack.Screen>

          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={{
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Animation values
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;

  // Global store
  const { setUser: setGlobalUser, initializeApp, reset } = useAppStore();

  // Splash video ref to control playback
  const splashVideoRef = useRef<any>(null);
  const minSplashTimer = useRef<NodeJS.Timeout | null>(null);
  const splashCompleted = useRef(false);
  
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        console.log('✅ AdMob initialized');
      });
  }, []);

  useEffect(() => {
    // Set status bar immediately
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#000000");
      StatusBar.setTranslucent(true);
    }

    // Initial logo animation
    Animated.spring(logoScaleAnim, {
      toValue: 1,
      tension: 10,
      friction: 2,
      useNativeDriver: true,
    }).start();

    let authUnsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        console.log('🚀 Starting app initialization...');

        // Set minimum splash duration
        minSplashTimer.current = setTimeout(() => {
          console.log('⏱️ Minimum splash time reached');
          splashCompleted.current = true;
          checkAndTransition();
        }, 2500); // 2.5 seconds minimum

        // Android force transition
        if (Platform.OS === 'android') {
          setTimeout(() => {
            if (showSplash) {
              console.log('Android: Force transition');
              splashCompleted.current = true;
              checkAndTransition();
            }
          }, 3000); // 3 second maximum wait
        }

        // Set up auth state listener
        authUnsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
          console.log('🔥 Auth state changed:', firebaseUser ? 'User logged in' : 'No user');

          if (firebaseUser) {
            try {
              const token = await firebaseUser.getIdToken();

              // Try to fetch profile from backend
              const response = await fetch(`https://aniflixx-backend.onrender.com/api/user/profile`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                const data = await response.json();
                const profile = data.user;

                console.log('✅ Valid user profile found:', profile.username);

                // Save to cache and state
                await saveUserProfile({
                  ...profile,
                  cachedAt: Date.now(),
                });
                
                setUser(profile);
                setGlobalUser(profile);
                initializeApp();
              } else {
                // User not found or error
                console.log('❌ Backend error, logging out');
                await handleAuthError();
              }
            } catch (error) {
              console.error('❌ Error validating user:', error);
              
              // Try cached profile as fallback
              const cachedProfile = await loadUserProfile();
              if (cachedProfile && cachedProfile.uid === firebaseUser.uid) {
                console.log('📱 Using cached profile');
                setUser(cachedProfile);
                setGlobalUser(cachedProfile);
                initializeApp();
              } else {
                await handleAuthError();
              }
            }
          } else {
            // No user logged in
            console.log('👤 No authenticated user');
            await clearUserProfile();
            setUser(null);
            reset();
          }

          setLoading(false);
          checkAndTransition();
        });

      } catch (error) {
        console.error('❌ Error during initialization:', error);
        setLoading(false);
        checkAndTransition();
      }
    };

    const handleAuthError = async () => {
      await auth().signOut();
      await clearUserProfile();
      setUser(null);
      reset();
    };

    const checkAndTransition = () => {
      if (!loading && splashCompleted.current && showSplash) {
        transitionFromSplash();
      }
    };

    // Start initialization
    initializeAuth();

    // Cleanup
    return () => {
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      if (minSplashTimer.current) {
        clearTimeout(minSplashTimer.current);
      }
    };
  }, [setGlobalUser, initializeApp, reset]);

  // Safety net for Android
  useEffect(() => {
    if (Platform.OS === 'android' && showSplash) {
      const safetyTimer = setTimeout(() => {
        if (showSplash) {
          console.log('Safety net: forcing transition');
          setLoading(false);
          splashCompleted.current = true;
          transitionFromSplash();
        }
      }, 4000); // 4 seconds absolute maximum
      
      return () => clearTimeout(safetyTimer);
    }
  }, [showSplash]);

  const transitionFromSplash = () => {
    console.log('🎬 Transitioning from splash');
    
    Animated.timing(splashFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start(() => {
      setShowSplash(false);
    });
  };

  const handleVideoEnd = () => {
    console.log('Video ended');
    if (!loading) {
      splashCompleted.current = true;
      transitionFromSplash();
    }
  };

  const handleVideoError = (error: any) => {
    console.error('Splash video error:', error);
    splashCompleted.current = true;
    if (!loading) {
      transitionFromSplash();
    }
  };

  const handleLogin = async (profile: any) => {
    console.log('✅ User logged in:', profile.username);
    setUser(profile);
    setGlobalUser(profile);
    
    // Initialize app after login
    setTimeout(() => {
      initializeApp();
    }, 100);
  };

  const handleLogout = async () => {
    try {
      console.log('👋 Logging out user...');

      // Clear local state first
      setUser(null);
      reset();

      // Clear cached profile
      await clearUserProfile();

      // Then logout from Firebase
      await logout();

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Show splash screen
  if (showSplash) {
    return (
      <View style={styles.rootContainer}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#000000"
          translucent={Platform.OS === 'android'}
        />
        
        <Animated.View
          style={[
            styles.splashContainer,
            { opacity: splashFadeAnim }
          ]}
        >
          <Animated.View
            style={[
              styles.splashContent,
              { transform: [{ scale: logoScaleAnim }] }
            ]}
          >
            <Video
              ref={splashVideoRef}
              source={require('./assets/logo-splash.mp4')}
              style={styles.splashLogoVideo}
              resizeMode="contain"
              onEnd={handleVideoEnd}
              onError={handleVideoError}
              muted={true}
              repeat={false}
              paused={false}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="ignore"
            />
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  // Main App - ONLY renders after splash is completely done
  return (
    <View style={styles.rootContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000000"
        translucent={Platform.OS === 'android'}
      />
      <SafeAreaProvider>
        {user ? (
          <WebSocketManager>
            <MainAppContent user={user} onLogout={handleLogout} />
          </WebSocketManager>
        ) : (
          <NavigationContainer theme={CustomDarkTheme}>
            <AuthNavigator onLogin={handleLogin} />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  tabContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: "#000000",
  },
  smallDeviceKeyboard: {
    paddingBottom: 0,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#101010",
    zIndex: 2,
  },
  splashContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#101010",
  },
  splashLogoVideo: {
    width: "70%",
    height: "70%",
    alignSelf: 'center',
  },
});

export default App;
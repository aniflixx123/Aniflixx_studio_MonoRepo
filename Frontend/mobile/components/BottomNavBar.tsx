import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Platform,
  UIManager,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  profileImage?: string;
}

// Export the navbar height for other components to use
export const NAVBAR_HEIGHT = isSmallDevice ? 55 : 65;
export const NAVBAR_BOTTOM_MARGIN = isSmallDevice ? 10 : 20;
export const TOTAL_NAVBAR_HEIGHT = NAVBAR_HEIGHT + NAVBAR_BOTTOM_MARGIN;

const BottomNavBar: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, profileImage }) => {
  const insets = useSafeAreaInsets();
  const userProfileImage = profileImage || 'https://api.dicebear.com/7.x/adventurer/svg?seed=default';
  
  // Animation value for slide-in
  const slideAnim = useRef(new Animated.Value(60)).current;
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      onChangeTab(tab);
    }
  };
  
  // Initial entry animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Dynamic bottom spacing based on device
  const dynamicBottom = Platform.select({
    ios: NAVBAR_BOTTOM_MARGIN + insets.bottom,
    android: NAVBAR_BOTTOM_MARGIN + (insets.bottom || 0),
  });
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          bottom: dynamicBottom,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* Home is active */}
      {activeTab === 'home' && (
        <View style={styles.rowContainer}>
          {/* Blue Home Tab */}
          <View style={[styles.bluePill, isSmallDevice && styles.smallBluePill]}>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('home')} activeOpacity={0.7}>
              <Ionicons name="home" size={isSmallDevice ? 20 : 22} color="#fff" style={styles.tabIcon} />
              <Text style={[styles.tabLabel, isSmallDevice && styles.smallTabLabel]}>Home</Text>
            </TouchableOpacity>
          </View>
          
          {/* Gray pill with other icons */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('flicks')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-circle-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('upload')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('account')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image source={{ uri: userProfileImage }} style={[styles.profileImage, isSmallDevice && styles.smallProfileImage]} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Flicks is active */}
      {activeTab === 'flicks' && (
        <View style={styles.rowContainer}>
          {/* Gray pill with Home */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('home')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="home-outline" size={isSmallDevice ? 20 : 22} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Blue Flicks Tab */}
          <View style={[styles.bluePill, isSmallDevice && styles.smallBluePill]}>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('flicks')} activeOpacity={0.7}>
              <Ionicons name="play-circle" size={isSmallDevice ? 24 : 28} color="#fff" style={styles.tabIcon} />
              <Text style={[styles.tabLabel, isSmallDevice && styles.smallTabLabel]}>Flicks</Text>
            </TouchableOpacity>
          </View>
          
          {/* Gray pill with other icons */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('upload')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('account')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image source={{ uri: userProfileImage }} style={[styles.profileImage, isSmallDevice && styles.smallProfileImage]} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Upload is active */} 
      {activeTab === 'upload' && (
        <View style={styles.rowContainer}>
          {/* Gray pill with Home and Flicks */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('home')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="home-outline" size={isSmallDevice ? 20 : 22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('flicks')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-circle-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Blue Upload Tab */}
          <View style={[styles.bluePill, isSmallDevice && styles.smallBluePill]}>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('upload')} activeOpacity={0.7}>
              <Ionicons name="add" size={isSmallDevice ? 24 : 28} color="#fff" style={styles.tabIcon} />
              <Text style={[styles.tabLabel, isSmallDevice && styles.smallTabLabel]}>Upload</Text>
            </TouchableOpacity>
          </View>
          
          {/* Gray pill with Account */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('account')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image source={{ uri: userProfileImage }} style={[styles.profileImage, isSmallDevice && styles.smallProfileImage]} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Account is active */}
      {activeTab === 'account' && (
        <View style={styles.rowContainer}>
          {/* Gray pill with Home, Flicks, and Upload */}
          <View style={[styles.grayPill, isSmallDevice && styles.smallGrayPill]}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('home')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="home-outline" size={isSmallDevice ? 20 : 22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('flicks')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="play-circle-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => handleTabChange('upload')}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-outline" size={isSmallDevice ? 24 : 28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {/* Blue Account Tab */}
          <View style={[styles.bluePill, isSmallDevice && styles.smallBluePill]}>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('account')} activeOpacity={0.7}>
              <Image source={{ uri: userProfileImage }} style={[styles.profileImage, styles.tabIcon, isSmallDevice && styles.smallProfileImage]} />
              <Text style={[styles.tabLabel, isSmallDevice && styles.smallTabLabel]}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: "center",
    justifyContent: "center",
  },
  bluePill: {
    backgroundColor: '#0066ff',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 25,
    zIndex: 2,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    marginHorizontal: -10,
  },
  smallBluePill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  grayPill: {
    flexDirection: 'row',
    backgroundColor: '#555555',
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 0,
    zIndex: 1,
  },
  smallGrayPill: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  smallTabLabel: {
    fontSize: 12,
  },
  iconButton: {
    marginHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  smallProfileImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default BottomNavBar;
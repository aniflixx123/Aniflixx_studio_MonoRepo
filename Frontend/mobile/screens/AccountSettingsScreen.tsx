import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');
const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface AccountSettingsScreenProps {
  navigation?: any;
  route?: any;
  onLogout?: () => Promise<void>;
}

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  profileImage?: string;
  isVerified?: boolean;
}

const AccountSettingsScreen = ({ navigation, route, onLogout }: AccountSettingsScreenProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;
  
  // Get global user from store
  const { user: globalUser } = useAppStore();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Toggle states - Only keep functional ones
  const [switches, setSwitches] = useState<any>({
    'Flicks autoplay': true,
    'Mute audio on preview': true,
  });

  useEffect(() => {
    // Use global user data immediately if available
    if (globalUser) {
      setProfile(globalUser as any);
      setLoading(false);
    } else {
      fetchUserProfile();
    }
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Update profile when global user changes
  useEffect(() => {
    if (globalUser) {
      setProfile(globalUser as any);
    }
  }, [globalUser]);

  const fetchUserProfile = async () => {
    try {
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const response = await fetch(`${API_BASE}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSwitch = (key: string) => {
    setSwitches((prev:any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onLogout) {
                await onLogout();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to log out');
            }
          },
        },
      ]
    );
  };

  const handleSectionPress = (sectionId: string) => {
    if (sectionId === 'edit-profile') {
      navigation.navigate('EditProfile');
      return;
    }
    
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleItemPress = (item: string) => {
    switch (item) {
      case 'Linked Email':
        Alert.alert('Email', currentUser?.email || 'No email linked');
        break;
      case 'Contact support':
        Linking.openURL('mailto:support@aniflixx.com?subject=Support Request');
        break;
      case 'Privacy Policy':
        Linking.openURL('https://aniflixx.com/privacy');
        break;
      case 'Terms of Service':
        Linking.openURL('https://aniflixx.com/terms');
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Image
              source={{ uri: profile?.profileImage || 'https://aniflixx.com/default-user.jpg' }}
              style={styles.profileImage}
            />
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>{profile?.username || 'User'}</Text>
              {profile?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>
          </View>

          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => handleSectionPress('edit-profile')}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Ionicons name="person-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Account Info */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => handleSectionPress('account')}
            >
              <View style={styles.sectionLeft}>
                <Ionicons name="information-circle-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Account Info</Text>
              </View>
              <Ionicons
                name={expandedSection === 'account' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {expandedSection === 'account' && (
              <Animated.View style={styles.sectionContent}>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress('Linked Email')}
                >
                  <Text style={styles.itemText}>Email</Text>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{currentUser?.email?.split('@')[0]}...</Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Flicks Settings */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => handleSectionPress('flicks')}
            >
              <View style={styles.sectionLeft}>
                <Ionicons name="film-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Flicks Settings</Text>
              </View>
              <Ionicons
                name={expandedSection === 'flicks' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {expandedSection === 'flicks' && (
              <Animated.View style={styles.sectionContent}>
                {['Flicks autoplay', 'Mute audio on preview'].map(item => (
                  <View key={item} style={styles.switchRow}>
                    <Text style={styles.itemText}>{item}</Text>
                    <Switch
                      value={switches[item] || false}
                      onValueChange={() => toggleSwitch(item)}
                      trackColor={{ false: '#333', true: '#4285F4' }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </Animated.View>
            )}
          </View>

          {/* Support */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => handleSectionPress('support')}
            >
              <View style={styles.sectionLeft}>
                <Ionicons name="help-circle-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Support</Text>
              </View>
              <Ionicons
                name={expandedSection === 'support' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {expandedSection === 'support' && (
              <Animated.View style={styles.sectionContent}>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress('Contact support')}
                >
                  <Text style={styles.itemText}>Contact support</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Legal */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => handleSectionPress('legal')}
            >
              <View style={styles.sectionLeft}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Legal</Text>
              </View>
              <Ionicons
                name={expandedSection === 'legal' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            
            {expandedSection === 'legal' && (
              <Animated.View style={styles.sectionContent}>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress('Privacy Policy')}
                >
                  <Text style={styles.itemText}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => handleItemPress('Terms of Service')}
                >
                  <Text style={styles.itemText}>Terms of Service</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Notifications - Link to existing screen */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLeft}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <Text style={styles.sectionTitle}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          {/* Version */}
          <Text style={styles.version}>AniFlixX Beta v1.0.0</Text>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  itemText: {
    color: '#999',
    fontSize: 15,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemValue: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  version: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 30,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default AccountSettingsScreen;
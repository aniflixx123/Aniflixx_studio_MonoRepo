// AccountAnalyticsScreen.tsx - Simplified to use backend analytics data

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';

const { width } = Dimensions.get('window');
const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface FlickAnalytic {
  _id: string;
  title: string;
  thumbnailUrl: string;
  views: number;
  publishedDate: string;
}

interface UserProfile {
  username: string;
  profileImage: string;
  followersCount: number;
  isVerified: boolean;
  flicksCount: number;
  followingCount: number;
}

interface AnalyticsData {
  totalFlicks: number;
  totalViews: number;
  followersCount: number;
  followingCount: number;
  estimatedRevenue: number;
  latestFlicks: FlickAnalytic[];
  period: string;
}

interface AccountAnalyticsProps {
  navigation?: any;
  onClose?: () => void;
  profile?: UserProfile;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

const AccountAnalyticsScreen: React.FC<AccountAnalyticsProps> = ({ 
  navigation, 
  onClose, 
  profile,
  period = '1month',
  onPeriodChange 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
  // Get current user from store
  const currentUser = useAppStore(state => state.user);
  
  const periodOptions = [
    { label: 'Past 1 Week', value: '1week' },
    { label: 'Past 1 Month', value: '1month' },
    { label: 'Past 3 Months', value: '3months' },
    { label: 'Past 1 Year', value: '1year' }
  ];

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const user = auth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Fetch analytics data from backend
      const response = await fetch(`${API_BASE}/analytics/account?period=${selectedPeriod}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      
      // Use the backend data directly
      setAnalyticsData({
        totalFlicks: data.totalFlicks || 0,
        totalViews: data.totalViews || 0,
        followersCount: data.followersCount || currentUser?.followersCount || 0,
        followingCount: data.followingCount || currentUser?.followingCount || 0,
        estimatedRevenue: 0, // Always 0 for now
        latestFlicks: data.latestFlicks || [],
        period: data.period || selectedPeriod
      });
      
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Failed to load analytics data');
      
      // Set empty data
      setAnalyticsData({
        totalFlicks: 0,
        totalViews: 0,
        followersCount: profile?.followersCount || 0,
        followingCount: profile?.followingCount || 0,
        estimatedRevenue: 0,
        latestFlicks: [],
        period: selectedPeriod
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
    setDropdownVisible(false);
  };

  const handleBackPress = () => {
    if (onClose) {
      onClose();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const getPeriodLabel = (value: string): string => {
    const option = periodOptions.find(opt => opt.value === value);
    return option ? option.label : 'Past 1 Month';
  };

  if (loading && !analyticsData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerBar} />
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.analyticsButton}>
            <Ionicons name="bar-chart" size={20} color="#fff" style={styles.analyticsIcon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account Analytics Title and Period Selector */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Account Analytics</Text>
          
          <TouchableOpacity 
            style={styles.periodSelector}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <Text style={styles.periodText}>{getPeriodLabel(selectedPeriod)}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" style={styles.periodIcon} />
          </TouchableOpacity>
        </View>
        
        {/* Period Dropdown */}
        {dropdownVisible && (
          <View style={styles.dropdownContainer}>
            {periodOptions.map((option) => (
              <TouchableOpacity 
                key={option.value}
                style={[
                  styles.dropdownItem, 
                  selectedPeriod === option.value && styles.selectedDropdownItem
                ]}
                onPress={() => handlePeriodChange(option.value)}
              >
                <Text 
                  style={[
                    styles.dropdownText,
                    selectedPeriod === option.value && styles.selectedDropdownText
                  ]}
                >
                  {option.label}
                </Text>
                {selectedPeriod === option.value && (
                  <Ionicons name="checkmark" size={16} color="#4285F4" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* User Profile Summary */}
        <View style={styles.profileSummary}>
          <Image 
            source={{ uri: profile?.profileImage || currentUser?.profileImage || 'https://i.pravatar.cc/150' }}
            style={styles.profileImage}
          />
          
          <View style={styles.profileInfo}>
            <View style={styles.usernameContainer}>
              <Text style={styles.username}>{profile?.username || currentUser?.username || 'User'}</Text>
              {(profile?.isVerified || currentUser?.isVerified) && (
                <Ionicons name="checkmark-circle" size={14} color="#4285F4" style={styles.verifiedBadge} />
              )}
            </View>
            
            <Text style={styles.followerCount}>
              {formatNumber(analyticsData?.followersCount || 0)}
            </Text>
            <Text style={styles.followerLabel}>Followers</Text>
          </View>
        </View>
        
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Flicks</Text>
              <Text style={styles.statValue}>{analyticsData?.totalFlicks || 0}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Views</Text>
              <Text style={styles.statValue}>{formatNumber(analyticsData?.totalViews || 0)}</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>{formatNumber(analyticsData?.followersCount || 0)}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Estimated Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(analyticsData?.estimatedRevenue || 0)}</Text>
            </View>
          </View>
        </View>
        
        {/* Latest Flicks Analytics */}
        <View style={styles.latestFlicksContainer}>
          <Text style={styles.latestFlicksTitle}>Latest Flicks Analytics</Text>
          
          {analyticsData?.latestFlicks && analyticsData.latestFlicks.length > 0 ? (
            analyticsData.latestFlicks.map((flick) => (
              <View key={flick._id} style={styles.flickAnalyticItem}>
                <Image 
                  source={{ uri: flick.thumbnailUrl }}
                  style={styles.flickThumbnail}
                />
                
                <View style={styles.flickAnalyticInfo}>
                  <Text style={styles.flickTitle} numberOfLines={1}>
                    {flick.title}
                  </Text>
                  
                  <View style={styles.publishDateContainer}>
                    <Text style={styles.publishDateLabel}>Published Date:</Text>
                    <Text style={styles.publishDate}>
                      {new Date(flick.publishedDate).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <Text style={styles.flickViews}>{formatNumber(flick.views)} Views</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noFlicksContainer}>
              <Ionicons name="videocam-outline" size={40} color="#555" />
              <Text style={styles.noFlicksText}>No flicks available for this period</Text>
            </View>
          )}
        </View>
        
        {/* Bottom Indicator Bar */}
        <View style={styles.bottomIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  analyticsIcon: {
    marginLeft: 2,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    color: '#fff',
    fontSize: 14,
  },
  periodIcon: {
    marginLeft: 4,
  },
  dropdownContainer: {
    backgroundColor: '#222',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: -15,
    marginBottom: 20,
    padding: 5,
    position: 'absolute',
    right: 16,
    top: 85,
    zIndex: 999,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  selectedDropdownItem: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
  },
  dropdownText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedDropdownText: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#555',
  },
  profileInfo: {
    marginLeft: 16,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  followerCount: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  followerLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statsGrid: {
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 16,
    width: (width - 36) / 2,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  latestFlicksContainer: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  latestFlicksTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  flickAnalyticItem: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 20,
  },
  flickThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  flickAnalyticInfo: {
    marginLeft: 14,
    flex: 1,
  },
  flickTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  publishDateContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  publishDateLabel: {
    color: '#aaa',
    fontSize: 12,
    marginRight: 4,
  },
  publishDate: {
    color: '#fff',
    fontSize: 12,
  },
  flickViews: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noFlicksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noFlicksText: {
    color: '#555',
    marginTop: 10,
    fontSize: 14,
  },
  bottomIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  indicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});

export default AccountAnalyticsScreen;
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import FollowService from '../services/FollowService';

interface FollowButtonProps {
  targetUid: string;
  username?: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUid,
  username = 'User',
  style,
  size = 'medium',
  showIcon = false,
  onFollowChange,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const currentUser = auth().currentUser;
  const isOwnProfile = currentUser?.uid === targetUid;

  // Check initial follow status
  useEffect(() => {
    if (!isOwnProfile && targetUid) {
      checkFollowStatus();
    } else {
      setCheckingStatus(false);
    }
  }, [targetUid, isOwnProfile]);

  const checkFollowStatus = async () => {
    try {
      setCheckingStatus(true);
      const result = await FollowService.checkFollowing(targetUid);
      setIsFollowing(result.following || false);
    } catch (error) {
      console.error('Error checking follow status:', error);
      // Default to not following if check fails
      setIsFollowing(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFollowPress = async () => {
    if (isOwnProfile || loading) return;

    console.log('Follow button pressed:', {
      targetUid,
      currentFollowState: isFollowing,
      currentUser: currentUser?.uid
    });

    setLoading(true);
    
    try {
      let result;
      if (isFollowing) {
        console.log('Attempting to unfollow:', targetUid);
        result = await FollowService.unfollowUser(targetUid);
      } else {
        console.log('Attempting to follow:', targetUid);
        result = await FollowService.followUser(targetUid);
      }

      console.log('Follow/Unfollow result:', result);

      // Check if we have a valid response with following status
      if (result && typeof result.following === 'boolean') {
        const newFollowState = result.following;
        setIsFollowing(newFollowState);
        
        if (onFollowChange) {
          onFollowChange(newFollowState);
        }
      } else {
        // If response doesn't have following status, toggle the local state
        const newFollowState = !isFollowing;
        setIsFollowing(newFollowState);
        
        if (onFollowChange) {
          onFollowChange(newFollowState);
        }
      }
    } catch (error: any) {
      console.error('Follow toggle error details:', {
        error: error,
        message: error.message,
        stack: error.stack
      });
      
      // Check if it's a "Already following" or "Not following" error
      // These are actually successful state confirmations from the backend
      if (error.message === 'Already following this user' && !isFollowing) {
        setIsFollowing(true);
        if (onFollowChange) {
          onFollowChange(true);
        }
      } else if (error.message === 'Not following this user' && isFollowing) {
        setIsFollowing(false);
        if (onFollowChange) {
          onFollowChange(false);
        }
      } else {
        // Only show alert for actual errors
        Alert.alert('Error', error.message || 'Failed to update follow status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render for own profile
  if (isOwnProfile) {
    return null;
  }

  // Show loading state while checking initial status
  if (checkingStatus) {
    return (
      <TouchableOpacity 
        style={[styles.button, styles[size], styles.loading, style]}
        disabled
      >
        <ActivityIndicator size="small" color="#666" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        isFollowing ? styles.following : styles.notFollowing,
        style
      ]}
      onPress={handleFollowPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          {showIcon && (
            <Ionicons
              name={isFollowing ? "checkmark" : "person-add"}
              size={size === 'small' ? 14 : size === 'large' ? 20 : 16}
              color="#fff"
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, styles[`${size}Text`]]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  notFollowing: {
    backgroundColor: '#4285F4',
  },
  following: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555',
  },
  loading: {
    backgroundColor: '#333',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  icon: {
    marginRight: 4,
  },
});

export default FollowButton;
// social-utils.ts
import auth from '@react-native-firebase/auth';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

// Follow a user
export const followUser = async (targetUid: string): Promise<{
  success: boolean;
  followersCount: number;
  followingCount: number;
  following: boolean;
}> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('Authentication required');
    
    const token = await user.getIdToken();
    
    const response = await fetch(`${API_BASE}/social/follow/${targetUid}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to follow user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

// Unfollow a user
export const unfollowUser = async (targetUid: string): Promise<{
  success: boolean;
  followersCount: number;
  followingCount: number;
  following: boolean;
}> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('Authentication required');
    
    const token = await user.getIdToken();
    
    const response = await fetch(`${API_BASE}/social/unfollow/${targetUid}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to unfollow user');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

// Check follow status
export const checkFollowStatus = async (targetUid: string): Promise<boolean> => {
  try {
    const user = auth().currentUser;
    if (!user) return false;
    
    const token = await user.getIdToken();
    
    const response = await fetch(`${API_BASE}/social/check/${targetUid}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.following;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

// Get followers list
export const getFollowers = async (targetUid: string, page: number = 0, limit: number = 20) => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('Authentication required');
    
    const token = await user.getIdToken();
    
    const response = await fetch(
      `${API_BASE}/social/${targetUid}/followers?skip=${page * limit}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get followers');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting followers:', error);
    throw error;
  }
};

// Get following list
export const getFollowing = async (targetUid: string, page: number = 0, limit: number = 20) => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('Authentication required');
    
    const token = await user.getIdToken();
    
    const response = await fetch(
      `${API_BASE}/social/${targetUid}/following?skip=${page * limit}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get following');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting following:', error);
    throw error;
  }
};

// Get suggested users to follow
export const getSuggestedUsers = async (limit: number = 10) => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('Authentication required');
    
    const token = await user.getIdToken();
    
    const response = await fetch(
      `${API_BASE}/social/suggestions?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get suggestions');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting suggested users:', error);
    throw error;
  }
};
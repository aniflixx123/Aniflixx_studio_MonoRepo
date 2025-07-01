import auth from '@react-native-firebase/auth';
import { Alert } from 'react-native';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

class FollowService {
  static async makeRequest(endpoint:any, method = 'GET') {
    const user = auth().currentUser;
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('Making request:', {
      endpoint,
      method,
      userId: user.uid
    });
    
    const token = await user.getIdToken();
    
    try {
      const url = `${API_BASE}${endpoint}`;
      console.log('Full URL:', url);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        // Handle specific error cases where the API returns useful data even with error status
        if (response.status === 400 && data.following !== undefined) {
          // This is for cases like "Already following" or "Not following"
          // The backend returns these as errors but includes the follow state
          console.log('Handled 400 error with follow state:', data);
          return data;
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`Error in ${endpoint}:`, error);
      throw error;
    }
  }

  // POST /social/follow/:targetUid
  static async followUser(targetUid:any) {
    try {
      const response = await this.makeRequest(
        `/social/follow/${targetUid}`, 
        'POST'
      );
      return response;
    } catch (error:any) {
      // Handle the "Already following" case
      if (error.message === 'Already following this user') {
        return {
          success: false,
          following: true,
          error: error.message
        };
      }
      throw error;
    }
  }

  // POST /social/unfollow/:targetUid  
  static async unfollowUser(targetUid:any) {
    try {
      const response = await this.makeRequest(
        `/social/unfollow/${targetUid}`, 
        'POST'
      );
      return response;
    } catch (error:any) {
      // Handle the "Not following" case
      if (error.message === 'Not following this user') {
        return {
          success: false,
          following: false,
          error: error.message
        };
      }
      throw error;
    }
  }

  // GET /social/check/:targetUid
  static async checkFollowing(targetUid:any) {
    return this.makeRequest(`/social/check/${targetUid}`);
  }

  // GET /social/:targetUid/followers
  static async getFollowers(targetUid:any, limit = 20, skip = 0) {
    return this.makeRequest(
      `/social/${targetUid}/followers?limit=${limit}&skip=${skip}`
    );
  }

  // GET /social/:targetUid/following
  static async getFollowing(targetUid:any, limit = 20, skip = 0) {
    return this.makeRequest(
      `/social/${targetUid}/following?limit=${limit}&skip=${skip}`
    );
  }

  // GET /social/suggestions
  static async getSuggestions(limit = 10) {
    return this.makeRequest(`/social/suggestions?limit=${limit}`);
  }
}

export default FollowService;
import auth from '@react-native-firebase/auth';

const API_BASE_URL = 'https://aniflixx-backend.onrender.com/api';
class APIError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}
/** --------- Viewer Tracking APIs ----------- */

// Register a viewer for a reel (start watching)
export const registerViewer = async (reelId: string): Promise<{ success: boolean }> => {
  const response = await apiRequest(`/reels/${reelId}/viewers/register`, { method: 'POST' });
  return response;
};

// Send heartbeat (keep session alive)
export const sendHeartbeat = async (reelId: string): Promise<{ success: boolean }> => {
  const response = await apiRequest(`/reels/${reelId}/viewers/heartbeat`, { method: 'POST' });
  return response;
};

// Deregister a viewer (stop watching)
export const deregisterViewer = async (reelId: string): Promise<{ success: boolean }> => {
  const response = await apiRequest(`/reels/${reelId}/viewers/deregister`, { method: 'POST' });
  return response;
};

// Get real-time viewer count
export const getViewerCount = async (reelId: string): Promise<{ count: number }> => {
  const response = await apiRequest(`/reels/${reelId}/viewers/count`, { method: 'GET' });
  return response;
};


const getAuthHeaders = async () => {
  const user = auth().currentUser;
  if (!user) {
    throw new APIError('User not authenticated', 401, 'AUTH_REQUIRED');
  }

  try {
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-region': 'us', // Add user region header
    };
  } catch (error) {
    throw new APIError('Failed to get authentication token', 401, 'TOKEN_ERROR');
  }
};

const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}, 
  retries = 3,
  timeout = 30000
): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData = null;

      try {
        errorData = await response.json();
        if (errorData.message || errorData.error) {
          errorMessage = errorData.message || errorData.error;
        }
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError);
      }

      throw new APIError(errorMessage, response.status, errorData?.code);
    }

    const data = await response.json();
    
    if (typeof data !== 'object' || data === null) {
      throw new APIError('Invalid response format', 500, 'INVALID_RESPONSE');
    }

    return data;

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      if (retries > 0) {
        console.log(`Request timeout, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiRequest(endpoint, options, retries - 1, timeout);
      }
      throw new APIError('Request timeout', 408, 'TIMEOUT');
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (retries > 0) {
        console.log(`Network error, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return apiRequest(endpoint, options, retries - 1, timeout);
      }
      throw new APIError('Network connection failed', 0, 'NETWORK_ERROR');
    }

    if (error instanceof APIError && error.status === 401) {
      if (retries > 0) {
        console.log('Auth error, attempting token refresh...');
        try {
          const user = auth().currentUser;
          if (user) {
            await user.getIdToken(true);
            return apiRequest(endpoint, options, retries - 1, timeout);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
    }

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError(error.message || 'Unknown error occurred', 500, 'UNKNOWN_ERROR');
  }
};

// UPDATED: Handle new response format
export const fetchReels = async (limit = 20, skip = 0): Promise<{
  reels: any[];
  success: boolean;
  message?: string;
  pagination?: any;
}> => {
  try {
    console.log(`Fetching reels: limit=${limit}, skip=${skip}`);
    
    const response = await apiRequest(`/reels?limit=${limit}&skip=${skip}`, {
      method: 'GET',
    });

    // Handle the standardized response format
    if (response && typeof response === 'object') {
      // Check if response has success field
      if (response.success === false) {
        console.error('API returned success: false', response);
        return {
          reels: [],
          success: false,
          message: response.message || 'Failed to fetch reels'
        };
      }

      // Extract reels array
      const reels = response.reels || [];
      
      // Validate each reel has required fields
      const validReels = reels.filter((reel: any) => {
        if (!reel._id || !reel.videoUrl) {
          console.warn('Invalid reel found:', reel);
          return false;
        }
        
        // Test if videoUrl is accessible
        if (typeof reel.videoUrl === 'string' && 
            (reel.videoUrl.startsWith('http://') || reel.videoUrl.startsWith('https://'))) {
          return true;
        }
        
        console.warn('Invalid video URL:', reel.videoUrl);
        return false;
      });

      console.log(`Fetched ${validReels.length} valid reels out of ${reels.length} total`);
      
      return {
        reels: validReels,
        success: true,
        pagination: response.pagination || {
          skip,
          limit,
          hasMore: validReels.length === limit
        }
      };
    }

    throw new APIError('Invalid response format', 500, 'INVALID_FORMAT');

  } catch (error: any) {
    console.error('Error fetching reels:', error);
    
    if (error instanceof APIError) {
      return {
        reels: [],
        success: false,
        message: error.message
      };
    }

    return {
      reels: [],
      success: false,
      message: 'Failed to fetch reels. Please try again.'
    };
  }
};

// UPDATED: Handle new response format
export const toggleLikeAPI = async (reelId: string): Promise<{
  liked: boolean;
  likesCount: number;
  success: boolean;
  message?: string;
}> => {
  try {
    console.log(`Toggling like for reel: ${reelId}`);
    
    const response = await apiRequest(`/reels/${reelId}/like`, {
      method: 'POST',
    });

    if (response.success === false) {
      throw new APIError(response.message || 'Like operation failed', 400, 'LIKE_FAILED');
    }

    if (typeof response.liked !== 'boolean' || typeof response.likesCount !== 'number') {
      throw new APIError('Invalid like response format', 500, 'INVALID_LIKE_RESPONSE');
    }

    console.log(`Like toggled: ${response.liked ? 'liked' : 'unliked'}, count: ${response.likesCount}`);

    return {
      liked: response.liked,
      likesCount: response.likesCount,
      success: true,
      message: response.message
    };

  } catch (error: any) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

export const toggleSaveAPI = async (reelId: string): Promise<{
  saved: boolean;
  savesCount: number;
  success: boolean;
  message?: string;
}> => {
  try {
    console.log(`Toggling save for reel: ${reelId}`);
    
    const response = await apiRequest(`/reels/${reelId}/save`, {
      method: 'POST',
    });

    if (response.success === false) {
      throw new APIError(response.message || 'Save operation failed', 400, 'SAVE_FAILED');
    }

    if (typeof response.saved !== 'boolean' || typeof response.savesCount !== 'number') {
      console.error('Invalid save response format:', response);
      throw new APIError('Invalid save response format', 500, 'INVALID_SAVE_RESPONSE');
    }

    console.log(`Save toggled: ${response.saved ? 'saved' : 'unsaved'}, count: ${response.savesCount}`);

    return {
      saved: response.saved,
      savesCount: response.savesCount,
      success: true,
      message: response.message
    };

  } catch (error: any) {
    console.error('Error toggling save:', error);
    throw error;
  }
};

// UPDATED: Handle new response format
export const addComment = async (reelId: string, text: string): Promise<{
  comment: any;
  success: boolean;
  message?: string;
}> => {
  try {
    if (!text.trim()) {
      throw new APIError('Comment text is required', 400, 'EMPTY_COMMENT');
    }

    if (text.length > 500) {
      throw new APIError('Comment is too long (max 500 characters)', 400, 'COMMENT_TOO_LONG');
    }

    console.log(`Adding comment to reel: ${reelId}`);
    
    const response = await apiRequest(`/reels/${reelId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    });

    if (response.success === false) {
      throw new APIError(response.message || 'Comment operation failed', 400, 'COMMENT_FAILED');
    }

    if (!response.comment) {
      throw new APIError('Invalid comment response format', 500, 'INVALID_COMMENT_RESPONSE');
    }

    console.log(`Comment added successfully`);

    return {
      comment: response.comment,
      success: true,
      message: response.message
    };

  } catch (error: any) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Upload functions remain mostly the same but with better error handling
export const getUploadUrl = async (filename: string): Promise<{
  uploadUrl: string;
  key: string;
  bucket: string;
  region: string;
  success: boolean;
  message?: string;
}> => {
  try {
    console.log(`Getting upload URL for: ${filename}`);
    
    const response = await apiRequest(`/upload/upload-url?filename=${encodeURIComponent(filename)}`, {
      method: 'GET',
    }, 2, 15000);

    if (response.success === false) {
      throw new APIError(response.message || 'Failed to get upload URL', 400, 'UPLOAD_URL_FAILED');
    }

    if (!response.uploadUrl || !response.key || !response.bucket) {
      throw new APIError('Invalid upload URL response', 500, 'INVALID_UPLOAD_RESPONSE');
    }

    console.log(`Upload URL generated for region: ${response.region}`);

    return {
      uploadUrl: response.uploadUrl,
      key: response.key,
      bucket: response.bucket,
      region: response.region || 'us',
      success: true,
      message: response.message
    };

  } catch (error: any) {
    console.error('Error getting upload URL:', error);
    throw error;
  }
};

export const registerReel = async (reelData: {
  title: string;
  description?: string;
  hashtags?: string;
  videoKey: string;
  bucket: string;
  region: string;
  thumbnailUrl?: string;
}): Promise<{
  reel: any;
  success: boolean;
  message?: string;
}> => {
  try {
    console.log(`Registering reel: ${reelData.title}`);
    
    if (!reelData.title?.trim()) {
      throw new APIError('Title is required', 400, 'MISSING_TITLE');
    }

    if (!reelData.videoKey?.trim()) {
      throw new APIError('Video key is required', 400, 'MISSING_VIDEO_KEY');
    }

    if (!reelData.bucket?.trim()) {
      throw new APIError('Bucket is required', 400, 'MISSING_BUCKET');
    }

    const response = await apiRequest('/upload/register', {
      method: 'POST',
      body: JSON.stringify({
        title: reelData.title.trim(),
        description: reelData.description?.trim() || '',
        hashtags: reelData.hashtags?.trim() || '',
        videoKey: reelData.videoKey,
        bucket: reelData.bucket,
        region: reelData.region || 'us',
        thumbnailUrl: reelData.thumbnailUrl || ''
      }),
    }, 1, 60000);

    if (response.success === false) {
      throw new APIError(response.message || 'Failed to register reel', 400, 'REEL_REGISTRATION_FAILED');
    }

    if (!response.reel) {
      throw new APIError('Invalid reel registration response', 500, 'INVALID_REEL_RESPONSE');
    }

    console.log(`Reel registered successfully: ${response.reel._id}`);

    return {
      reel: response.reel,
      success: true,
      message: response.message
    };

  } catch (error: any) {
    console.error('Error registering reel:', error);
    throw error;
  }
};

// UPDATED: Better upload progress tracking
export const uploadVideoToSignedUrl = async (
  signedUrl: string, 
  videoUri: string,
  onProgress?: (progress: number) => void
): Promise<boolean> => {
  try {
    console.log(`Uploading video to signed URL...`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(Math.round(progress));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log(`Video uploaded successfully`);
          resolve(true);
        } else {
          console.error(`Upload failed with status: ${xhr.status}`);
          reject(new APIError(`Upload failed: ${xhr.status} ${xhr.statusText}`, xhr.status, 'UPLOAD_FAILED'));
        }
      });

      xhr.addEventListener('error', () => {
        console.error(`Upload network error`);
        reject(new APIError('Upload network error', 0, 'UPLOAD_NETWORK_ERROR'));
      });

      xhr.addEventListener('timeout', () => {
        console.error(`Upload timeout`);
        reject(new APIError('Upload timeout', 408, 'UPLOAD_TIMEOUT'));
      });

      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        type: 'video/mp4',
        name: 'video.mp4',
      } as any);

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', 'video/mp4');
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(formData);
    });

  } catch (error: any) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

export { APIError };
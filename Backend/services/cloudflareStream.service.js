const axios = require('axios');

class CloudflareStreamService {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
    
    // Validate required environment variables
    if (!this.accountId || !this.apiToken) {
      console.error('❌ Missing required Cloudflare environment variables');
      console.error('Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN');
    }
    
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
  }

  // Check if service is properly configured
  isConfigured() {
    return !!(this.accountId && this.apiToken);
  }

  // Get direct upload URL for client-side upload
  async getDirectUploadUrl(options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    console.log('🎥 Generating Cloudflare Stream upload URL...');
    
    try {
      const uploadOptions = {
        maxDurationSeconds: options.maxDuration || 3600, // 1 hour max by default
        expiry: new Date(Date.now() + (options.expiryMs || 3600000)).toISOString(),
        requireSignedURLs: options.requireSignedURLs || false,
        thumbnailTimestampPct: options.thumbnailTimestampPct || 0.1,
        ...(options.allowedOrigins && { allowedOrigins: options.allowedOrigins }),
        ...(options.watermark && { watermark: options.watermark }),
        ...(options.meta && { meta: options.meta })
      };

      const response = await axios.post(
        `${this.baseUrl}/direct_upload`,
        uploadOptions,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Stream upload URL generated successfully');
      return {
        uploadURL: response.data.result.uploadURL,
        uid: response.data.result.uid,
        watermark: response.data.result.watermark,
        created: response.data.result.created
      };
    } catch (error) {
      this.handleError('Stream upload URL generation', error);
    }
  }

  // Get video details after upload
  async getVideoDetails(videoId) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      const video = response.data.result;
      
      // Return formatted video details
      return {
        uid: video.uid,
        status: video.status,
        playback: {
          hls: video.playback?.hls,
          dash: video.playback?.dash
        },
        preview: video.preview,
        thumbnail: video.thumbnail,
        duration: video.duration,
        size: video.size,
        input: video.input,
        created: video.created,
        modified: video.modified,
        uploadExpiry: video.uploadExpiry,
        ready: video.readyToStream,
        requireSignedURLs: video.requireSignedURLs,
        allowedOrigins: video.allowedOrigins,
        meta: video.meta
      };
    } catch (error) {
      this.handleError('Get video details', error);
    }
  }

  // Delete a video
  async deleteVideo(videoId) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    try {
      await axios.delete(
        `${this.baseUrl}/${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
      
      console.log(`✅ Video ${videoId} deleted successfully`);
      return true;
    } catch (error) {
      this.handleError('Delete video', error);
    }
  }

  // Update video metadata
  async updateVideoMeta(videoId, meta) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${videoId}`,
        { meta },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Video ${videoId} metadata updated`);
      return response.data.result;
    } catch (error) {
      this.handleError('Update video metadata', error);
    }
  }

  // Create signed URL for private videos
  async createSignedUrl(videoId, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${videoId}/token`,
        {
          exp: options.expiry || Math.floor(Date.now() / 1000) + 3600, // 1 hour default
          nbf: options.notBefore,
          downloadable: options.downloadable || false,
          accessRules: options.accessRules || []
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.result.token;
    } catch (error) {
      this.handleError('Create signed URL', error);
    }
  }

  // Wait for video to be ready with improved status handling
  async waitForVideoReady(videoId, options = {}) {
    const maxAttempts = options.maxAttempts || 60; // 2 minutes default
    const delayMs = options.delayMs || 2000; // 2 seconds between checks
    const onProgress = options.onProgress || (() => {});
    
    console.log(`⏳ Waiting for video ${videoId} to be ready...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const video = await this.getVideoDetails(videoId);
        const status = video.status.state;
        const pctComplete = video.status.pctComplete || 0;
        
        // Call progress callback
        onProgress({
          state: status,
          pctComplete,
          attempt: i + 1,
          maxAttempts
        });
        
        if (status === 'ready' && video.ready) {
          console.log('✅ Video is ready for playback');
          return video;
        }
        
        if (status === 'error' || status === 'cancelled') {
          throw new Error(`Video processing failed with status: ${status}`);
        }
        
        console.log(`⏳ Video status: ${status} (${pctComplete}% complete), attempt ${i + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Video processing timeout: ${error.message}`);
        }
        // Continue retrying on temporary errors
        console.warn(`⚠️ Retry ${i + 1}/${maxAttempts} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw new Error('Video processing timeout - max attempts reached');
  }

  // Get video analytics
  async getVideoAnalytics(videoId, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare Stream service not properly configured');
    }

    try {
      const params = new URLSearchParams();
      if (options.since) params.append('since', options.since);
      if (options.until) params.append('until', options.until);
      if (options.step) params.append('step', options.step);
      
      const response = await axios.get(
        `${this.baseUrl}/${videoId}/stats?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
      
      return response.data.result;
    } catch (error) {
      this.handleError('Get video analytics', error);
    }
  }

  // Error handler
  handleError(operation, error) {
    const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
    const errorCode = error.response?.status;
    
    console.error(`❌ ${operation} failed:`, errorMessage);
    
    if (errorCode === 401) {
      throw new Error('Invalid Cloudflare API credentials');
    } else if (errorCode === 403) {
      throw new Error('Insufficient permissions for Cloudflare Stream');
    } else if (errorCode === 404) {
      throw new Error('Video not found');
    } else if (errorCode === 429) {
      throw new Error('Rate limit exceeded - please try again later');
    } else {
      throw new Error(`${operation} failed: ${errorMessage}`);
    }
  }

  // Get service configuration status (for debugging)
  getConfigStatus() {
    return {
      configured: this.isConfigured(),
      accountId: this.accountId ? `${this.accountId.substring(0, 8)}...` : 'NOT SET',
      apiToken: this.apiToken ? 'SET' : 'NOT SET',
      customerCode: this.customerCode || 'NOT SET',
      baseUrl: this.baseUrl
    };
  }
}

module.exports = new CloudflareStreamService();
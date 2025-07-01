// services/ChunkedUploadService.ts
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';

interface ChunkedUploadOptions {
  uri: string;
  uploadUrl?: string;
  videoId?: string;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  useDirectBackend?: boolean;
}

class ChunkedUploadService {
  private static CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  private static MAX_PARALLEL_UPLOADS = 3;
  private static MAX_RETRIES = 3;
  private static API_BASE = 'https://aniflixx-backend.onrender.com/api';

  // Method 1: Upload directly to backend (which streams to Cloudflare)
  static async uploadDirectToBackend(options: {
    uri: string;
    videoId: string;
    onProgress?: (progress: number) => void;
  }): Promise<void> {
    const { uri, videoId, onProgress } = options;
    
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      
      const token = await currentUser.getIdToken();
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.open('POST', `${this.API_BASE}/upload/stream`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: 'video/mp4',
          name: 'video.mp4'
        } as any);
        formData.append('videoId', videoId);

        xhr.send(formData);
      });
    } catch (error) {
      console.error('Direct upload failed:', error);
      throw error;
    }
  }

  // Method 2: Simple chunked upload for React Native
  static async uploadWithChunks(options: ChunkedUploadOptions): Promise<void> {
    const {
      uri,
      uploadUrl,
      chunkSize = this.CHUNK_SIZE,
      onProgress,
      onError
    } = options;

    try {
      // For React Native, we'll use a simpler approach
      // Since we can't easily read file chunks, we'll just upload the whole file
      // but with better error handling and retry logic
      
      const fileInfo = await RNFS.stat(uri);
      const fileSize = fileInfo.size;
      
      console.log(`📤 Uploading ${(fileSize / 1024 / 1024).toFixed(2)}MB file`);

      if (!uploadUrl) {
        throw new Error('Upload URL is required');
      }

      // Use XMLHttpRequest for better progress tracking
      return new Promise((resolve, reject) => {
        let retries = 0;
        
        const attemptUpload = () => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              onProgress?.(progress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              console.log('✅ Upload successful');
              resolve();
            } else if (xhr.status >= 500 && retries < this.MAX_RETRIES) {
              retries++;
              console.log(`⚠️ Server error, retrying (${retries}/${this.MAX_RETRIES})...`);
              setTimeout(attemptUpload, Math.pow(2, retries) * 1000);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            if (retries < this.MAX_RETRIES) {
              retries++;
              console.log(`⚠️ Network error, retrying (${retries}/${this.MAX_RETRIES})...`);
              setTimeout(attemptUpload, Math.pow(2, retries) * 1000);
            } else {
              reject(new Error('Network error after max retries'));
            }
          });

          xhr.addEventListener('timeout', () => {
            if (retries < this.MAX_RETRIES) {
              retries++;
              console.log(`⚠️ Timeout, retrying (${retries}/${this.MAX_RETRIES})...`);
              setTimeout(attemptUpload, Math.pow(2, retries) * 1000);
            } else {
              reject(new Error('Upload timeout after max retries'));
            }
          });

          xhr.open('POST', uploadUrl);
          xhr.timeout = 300000; // 5 minutes per attempt
          
          const formData = new FormData();
          formData.append('file', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: 'video/mp4',
            name: 'video.mp4'
          } as any);

          xhr.send(formData);
        };

        attemptUpload();
      });

    } catch (error) {
      console.error('❌ Upload failed:', error);
      onError?.(error as Error);
      throw error;
    }
  }

  // Method 3: Resumable upload (for future implementation)
  static async uploadResumable(options: {
    uri: string;
    uploadUrl: string;
    onProgress?: (progress: number) => void;
    resumeFrom?: number;
  }): Promise<void> {
    // This would require server support for resumable uploads
    // Using protocols like TUS or custom implementation
    console.log('Resumable upload not yet implemented');
    return this.uploadWithChunks(options);
  }

  // Utility: Calculate optimal chunk size based on network
  static getOptimalChunkSize(networkType: string): number {
    switch (networkType) {
      case 'wifi':
        return 10 * 1024 * 1024; // 10MB for WiFi
      case '4g':
        return 5 * 1024 * 1024; // 5MB for 4G
      case '3g':
        return 2 * 1024 * 1024; // 2MB for 3G
      default:
        return 1 * 1024 * 1024; // 1MB for slow connections
    }
  }

  // Utility: Estimate upload time
  static estimateUploadTime(fileSize: number, networkType: string): string {
    // Rough estimates of upload speeds (in bytes per second)
    const speeds: Record<string, number> = {
      'wifi': 5 * 1024 * 1024,     // 5 MB/s
      '4g': 2 * 1024 * 1024,        // 2 MB/s
      '3g': 500 * 1024,             // 500 KB/s
      'cellular': 1 * 1024 * 1024,  // 1 MB/s
      'unknown': 500 * 1024         // 500 KB/s
    };

    const speed = speeds[networkType] || speeds['unknown'];
    const seconds = fileSize / speed;

    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else {
      return `${(seconds / 3600).toFixed(1)} hours`;
    }
  }
}

export default ChunkedUploadService;
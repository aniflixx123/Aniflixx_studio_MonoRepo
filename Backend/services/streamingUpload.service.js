// services/streamingUpload.service.js
const multer = require('multer');
const { PassThrough } = require('stream');
const axios = require('axios');
const FormData = require('form-data');

class StreamingUploadService {
  constructor() {
    this.uploadSessions = new Map();
  }

  // Configure multer for streaming
  getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
      }
    });
  }

  // Stream directly to Cloudflare without saving to disk
  async streamToCloudflare(req, res) {
    const { uploadUrl } = req.body;
    
    try {
      // Create a pass-through stream
      const passThrough = new PassThrough();
      
      // Set up the form data
      const form = new FormData();
      form.append('file', passThrough, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });

      // Start streaming to Cloudflare
      const cloudflareResponse = axios({
        method: 'POST',
        url: uploadUrl,
        data: form,
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // Stream the upload
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Send progress via Server-Sent Events or WebSocket
          this.sendProgress(req.user.uid, percentCompleted);
        }
      });

      // Pipe the incoming request to Cloudflare
      req.pipe(passThrough);

      // Wait for upload to complete
      const response = await cloudflareResponse;
      
      res.json({
        success: true,
        videoId: response.data.result.uid
      });
      
    } catch (error) {
      console.error('Streaming upload failed:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }

  // Handle chunked uploads
  async handleChunkUpload(req, res) {
    const {
      chunkIndex,
      totalChunks,
      fileSize,
      uploadId
    } = req.body;

    const chunk = req.file;
    
    if (!chunk) {
      return res.status(400).json({ error: 'No chunk provided' });
    }

    try {
      // Get or create upload session
      let session = this.uploadSessions.get(uploadId);
      if (!session) {
        session = {
          chunks: new Array(parseInt(totalChunks)),
          uploadedChunks: 0,
          fileSize: parseInt(fileSize),
          startTime: Date.now()
        };
        this.uploadSessions.set(uploadId, session);
      }

      // Store chunk
      session.chunks[parseInt(chunkIndex)] = chunk.buffer;
      session.uploadedChunks++;

      // Check if all chunks received
      if (session.uploadedChunks === parseInt(totalChunks)) {
        // Combine chunks
        const completeFile = Buffer.concat(session.chunks);
        
        // Upload to Cloudflare
        const videoId = await this.uploadToCloudflare(completeFile);
        
        // Clean up session
        this.uploadSessions.delete(uploadId);
        
        res.json({
          success: true,
          complete: true,
          videoId
        });
      } else {
        res.json({
          success: true,
          complete: false,
          uploadedChunks: session.uploadedChunks,
          totalChunks: parseInt(totalChunks)
        });
      }
      
    } catch (error) {
      console.error('Chunk upload failed:', error);
      res.status(500).json({
        error: 'Chunk upload failed',
        message: error.message
      });
    }
  }

  // Upload complete buffer to Cloudflare
  async uploadToCloudflare(buffer) {
    const form = new FormData();
    form.append('file', buffer, {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    });

    const response = await axios.post(
      process.env.CLOUDFLARE_UPLOAD_URL,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
        }
      }
    );

    return response.data.result.uid;
  }

  // Send progress updates
  sendProgress(userId, progress) {
    // Use WebSocket or SSE to send progress
    if (global.websocketService) {
      global.websocketService.emitToUser(userId, 'upload:progress', { progress });
    }
  }

  // Clean up old sessions periodically
  cleanupSessions() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [uploadId, session] of this.uploadSessions.entries()) {
      if (now - session.startTime > timeout) {
        this.uploadSessions.delete(uploadId);
      }
    }
  }
}

module.exports = new StreamingUploadService();
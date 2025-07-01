// controllers/upload.controller.js
const streamService = require('../services/cloudflareStream.service');
const { reels } = require('../utils/db');

exports.getUploadUrl = async (req, res) => {
  try {
    if (!req.user) {
      console.error('❌ Auth middleware failed: req.user missing');
      return res.status(401).json({ error: 'Unauthorized', message: 'Auth failed' });
    }
    const { uid, username } = req.user;
    console.log(`📤 Generating upload URL for user: ${username}`);

    const uploadData = await streamService.getDirectUploadUrl();

    res.status(200).json({
      uploadUrl: uploadData.uploadURL,
      videoId: uploadData.uid,
      provider: 'cloudflare-stream',
      expiresIn: 3600,
      instructions: { method: 'POST', formFields: { file: 'your-video-file' } }
    });
  } catch (error) {
    console.error('❌ Upload URL generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate upload URL',
      message: error.message
    });
  }
};


exports.registerReel = async (req, res) => {
  try {
    const { uid, username, profileImage } = req.user;
    const { 
      videoId, 
      title, 
      description, 
      hashtags 
    } = req.body;

    console.log(`📝 Registering reel for video: ${videoId}`);

    // Wait for video to be ready in Cloudflare Stream
    console.log('⏳ Waiting for video processing...');
    const videoDetails = await streamService.waitForVideoReady(videoId);
    
    console.log('✅ Video processed successfully');

    // Process hashtags
    const processedHashtags = hashtags
      .trim()
      .split(/\s+/)
      .filter(tag => tag.startsWith('#') && tag.length > 1)
      .slice(0, 10);

    // Create reel document
    const reel = {
      uid,
      username,
      profileImage,
      title: title.trim(),
      description: description.trim(),
      hashtags: processedHashtags,
      
      // Cloudflare Stream data
      streamVideoId: videoId,
      streamData: {
        duration: videoDetails.duration,
        size: videoDetails.size,
        width: videoDetails.input.width,
        height: videoDetails.input.height,
        thumbnailUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`,
        animatedThumbnailUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.gif`,
        playbackUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/manifest/video.m3u8`,
        dashUrl: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/manifest/video.mpd`,
        previewUrl: videoDetails.preview,
        status: videoDetails.status,
        created: videoDetails.created,
        modified: videoDetails.modified
      },
      
      // Engagement data
      likes: [],
      saves: [],
      comments: [],
      views: 0,
      
      // Metadata
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await reels().insertOne(reel);

    if (!result.insertedId) {
      throw new Error('Failed to save reel to database');
    }

    console.log(`✅ Reel registered with ID: ${result.insertedId}`);

    res.status(201).json({
      success: true,
      reelId: result.insertedId,
      message: 'Reel uploaded successfully',
      reel: {
        id: result.insertedId,
        title: reel.title,
        thumbnail: reel.streamData.thumbnailUrl,
        duration: reel.streamData.duration
      }
    });
  } catch (error) {
    console.error('❌ Reel registration failed:', error);
    res.status(500).json({ 
      error: 'Failed to register reel',
      message: error.message 
    });
  }
};

// Optional: Check upload status
exports.checkUploadStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const videoDetails = await streamService.getVideoDetails(videoId);
    
    res.json({
      videoId,
      status: videoDetails.status.state,
      progress: videoDetails.status.pctComplete,
      ready: videoDetails.status.state === 'ready',
      error: videoDetails.status.errorReasonCode,
      details: {
        duration: videoDetails.duration,
        size: videoDetails.size,
        thumbnail: `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`
      }
    });
  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({ 
      error: 'Failed to check upload status',
      message: error.message 
    });
  }
};
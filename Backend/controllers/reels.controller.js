// controllers/reels.controller.js - Complete file with saves removed
const { reels, users, viewers} = require('../utils/db');
const { ObjectId } = require('mongodb');
const { createNotification } = require('./notifications.controller');

// Helper to get view count
const getViewCount = async (reelId) => {
  try {
    return await viewers().countDocuments({ reelId });
  } catch (err) {
    return 0;
  }
};

// Get video URL from Cloudflare Stream data
const getVideoUrl = (reel) => {
  if (reel.streamData?.playbackUrl) {
    return reel.streamData.playbackUrl;
  }
  
  if (reel.videoUrl) {
    return reel.videoUrl;
  }
  
  if (reel.streamVideoId && process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE) {
    return `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${reel.streamVideoId}/manifest/video.m3u8`;
  }
  
  return null;
};

// Get thumbnail URL
const getThumbnailUrl = (reel) => {
  if (reel.streamData?.thumbnailUrl) return reel.streamData.thumbnailUrl;
  if (reel.thumbnailUrl) return reel.thumbnailUrl;
  if (reel.streamVideoId && process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE) {
    return `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${reel.streamVideoId}/thumbnails/thumbnail.jpg`;
  }
  return `https://via.placeholder.com/640x360/1a1a1a/4285F4?text=${encodeURIComponent((reel.title || 'Video').substring(0, 20))}`;
};

const likeReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;

    if (!ObjectId.isValid(reelId)) {
      return res.status(400).json({ error: 'Invalid reel ID' });
    }

    // Get reel details first
    const reel = await reels().findOne({ _id: new ObjectId(reelId) });
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Check current like status
    const isCurrentlyLiked = reel.likes && reel.likes.includes(uid);

    const result = await reels().updateOne(
      { _id: new ObjectId(reelId), status: { $ne: 'deleted' } },
      [
        {
          $set: {
            likes: {
              $cond: {
                if: { $in: [uid, { $ifNull: ["$likes", []] }] },
                then: { $filter: { input: { $ifNull: ["$likes", []] }, cond: { $ne: ["$$this", uid] } } },
                else: { $concatArrays: [{ $ifNull: ["$likes", []] }, [uid]] }
              }
            },
            updatedAt: new Date()
          }
        }
      ]
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Update stats count
    const updatedReel = await reels().findOne(
      { _id: new ObjectId(reelId) },
      { projection: { likes: 1 } }
    );

    const likes = Array.isArray(updatedReel?.likes) ? updatedReel.likes : [];
    const isLiked = likes.includes(uid);
    
    // Update stats
    await reels().updateOne(
      { _id: new ObjectId(reelId) },
      { $set: { 'stats.likes': likes.length } }
    );

    // Create notification if this is a new like (not unlike) and not the user's own reel
    if (isLiked && !isCurrentlyLiked && reel.uid !== uid) {
      const liker = await users().findOne({ uid });
      
      await createNotification({
        type: 'like',
        recipientUid: reel.uid,
        senderUid: uid,
        senderName: liker?.username || 'Someone',
        senderImage: liker?.profileImage || '',
        reelId: reelId,
        reelTitle: reel.title,
        message: `${liker?.username || 'Someone'} liked your flick`
      });
    }
    
    return res.status(200).json({ 
      liked: isLiked, 
      likesCount: likes.length,
      success: true
    });
  } catch (err) {
    console.error('Error liking reel:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Simplified saveReel function
const saveReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user.uid;
    
    console.log(`💾 Save request: User ${userId} for reel ${reelId}`);
    
    // Validate reel ID
    if (!ObjectId.isValid(reelId)) {
      return res.status(400).json({ error: 'Invalid reel ID' });
    }
    
    // Check if reel exists
    const reel = await reels().findOne({ _id: new ObjectId(reelId) });
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    // Get current user to check if already saved
    const user = await users().findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize savedReels if it doesn't exist
    if (!Array.isArray(user.savedReels)) {
      await users().updateOne(
        { uid: userId },
        { $set: { savedReels: [] } }
      );
      user.savedReels = [];
    }
    
    // Check if already saved
    const isSaved = user.savedReels.some(id => 
      id.toString() === reelId
    );
    
    console.log(`Current save status: ${isSaved}`);
    
    // Toggle save status
    let userResult;
    if (isSaved) {
      // Remove from savedReels
      userResult = await users().updateOne(
        { uid: userId },
        { 
          $pull: { savedReels: new ObjectId(reelId) },
          $set: { updatedAt: new Date() }
        }
      );
    } else {
      // Add to savedReels
      userResult = await users().updateOne(
        { uid: userId },
        { 
          $addToSet: { savedReels: new ObjectId(reelId) },
          $set: { updatedAt: new Date() }
        }
      );
    }
    
    console.log(`User update result: modified ${userResult.modifiedCount} document(s)`);
    
    // Get updated user to confirm save count
    const updatedUser = await users().findOne({ uid: userId });
    const savedCount = updatedUser?.savedReels?.length || 0;
    console.log(`✅ Save operation complete. User now has ${savedCount} saved reels`);
    
    // Emit WebSocket event
    try {
      const webSocketService = require('../services/websocket.service');
      if (webSocketService.getIO()) {
        // Emit to the reel room so other viewers see updated save status
        webSocketService.getIO().to(`reel:${reelId}`).emit('reel:saved', {
          reelId,
          userId,
          isSaved: !isSaved
        });
        
        // Also emit acknowledgment to the user
        const socketId = webSocketService.userSockets.get(userId);
        if (socketId) {
          webSocketService.getIO().to(socketId).emit('reel:save:ack', {
            reelId,
            isSaved: !isSaved,
            savedCount
          });
        }
      }
    } catch (wsError) {
      console.error('WebSocket error (non-fatal):', wsError.message);
    }
    
    // Create notification for save (not unsave) and not own reel
    if (!isSaved && reel.uid && reel.uid !== userId) {
      try {
        const saver = await users().findOne({ uid: userId });
        await createNotification({
          type: 'save',
          recipientUid: reel.uid,
          senderUid: userId,
          senderName: saver?.username || 'Someone',
          senderImage: saver?.profileImage || '',
          reelId: reelId,
          reelTitle: reel.title || 'your flick',
          message: `${saver?.username || 'Someone'} saved your flick`
        });
      } catch (notifError) {
        console.error('Notification error (non-fatal):', notifError.message);
      }
    }
    
    // Return response
    res.json({
      success: true,
      saved: !isSaved,
      message: !isSaved ? 'Reel saved successfully' : 'Reel unsaved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving reel:', error);
    res.status(500).json({ 
      error: 'Failed to save reel',
      message: error.message 
    });
  }
};
// In reels.controller.js, optimize the getReels method:

const getReels = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = Math.max(parseInt(req.query.skip) || 0, 0);
    const currentUserUid = req.user?.uid;

    console.log(`Fetching reels - limit: ${limit}, skip: ${skip}, user: ${currentUserUid}`);

    // Get current user's data in parallel with reels
    const [currentUser, reelDocs] = await Promise.all([
      currentUserUid ? users().findOne({ uid: currentUserUid }) : null,
      reels().aggregate([
        { 
          $match: { 
            status: { $ne: 'deleted' },
            'streamData.status.state': 'ready'
          } 
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'uid',
            foreignField: 'uid',
            as: 'userInfo'
          }
        },
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
        // Add view count aggregation
        {
          $lookup: {
            from: 'viewers',
            let: { reelId: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$reelId', '$$reelId'] },
                  isAnalyticView: true
                }
              },
              { $count: 'total' }
            ],
            as: 'viewStats'
          }
        }
      ]).toArray()
    ]);

    const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];

    if (reelDocs.length === 0) {
      return res.status(200).json({ 
        reels: [],
        pagination: { skip, limit, hasMore: false },
        success: true
      });
    }

    // Process reels in parallel
    const processedReels = await Promise.all(
      reelDocs.map(async (reel) => {
        try {
          const videoUrl = getVideoUrl(reel);
          if (!videoUrl) {
            console.warn(`No video URL available for reel ${reel._id}`);
            return null;
          }

          const views = reel.viewStats?.[0]?.total || 0;
          const likes = Array.isArray(reel.likes) ? reel.likes : [];

          return {
            _id: reel._id.toString(),
            videoUrl,
            title: reel.title || '',
            description: reel.description || '',
            hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
            likes,
            likesCount: reel.stats?.likes || likes.length,
            isLiked: currentUserUid ? likes.includes(currentUserUid) : false,
            isSaved: userSavedReels.includes(reel._id.toString()),
            commentsCount: reel.stats?.comments || reel.commentsCount || 0,
            uid: reel.uid || '',
            username: reel.userInfo?.username || reel.username || 'anonymous',
            profileImage: reel.userInfo?.profileImage || reel.profileImage || '',
            thumbnailUrl: getThumbnailUrl(reel),
            createdAt: reel.createdAt,
            views: views,
            viewers: 0, // Real-time count handled by WebSocket
            duration: reel.streamData?.duration || reel.duration || 0,
            streamVideoId: reel.streamVideoId,
            isCloudflareStream: !!reel.streamData,
            user: {
              uid: reel.uid,
              username: reel.userInfo?.username || reel.username || 'anonymous',
              profileImage: reel.userInfo?.profileImage || reel.profileImage || '',
              isVerified: reel.userInfo?.isVerified || false
            }
          };
        } catch (error) {
          console.error(`Error processing reel ${reel._id}:`, error);
          return null;
        }
      })
    );

    const validReels = processedReels.filter(reel => reel !== null);
    
    // Cache result for 30 seconds
    const cacheKey = `reels:${currentUserUid}:${skip}:${limit}`;
    if (global.reelsCache) {
      global.reelsCache.set(cacheKey, validReels, 30);
    }

    return res.status(200).json({ 
      reels: validReels,
      pagination: {
        skip,
        limit,
        hasMore: validReels.length === limit,
        total: validReels.length
      },
      success: true
    });
  } catch (err) {
    console.error('Error fetching reels:', err);
    return res.status(500).json({ 
      error: 'Failed to load reels',
      message: err.message,
      success: false
    });
  }
};

const getUploadedReels = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Get current user's saved reels
    const currentUser = await users().findOne({ uid });
    const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];

    const uploaded = await reels()
      .find({ 
        uid, 
        status: { $ne: 'deleted' },
        $or: [
          { 'streamData.status.state': 'ready' },
          { videoUrl: { $exists: true, $ne: null } }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    const final = await Promise.all(
      uploaded.map(async (reel) => {
        const videoUrl = getVideoUrl(reel);
        const views = await getViewCount(reel._id.toString());
        const likes = Array.isArray(reel.likes) ? reel.likes : [];
        const comments = Array.isArray(reel.comments) ? reel.comments : [];

        return {
          _id: reel._id.toString(),
          videoUrl,
          title: reel.title || '',
          description: reel.description || '',
          hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
          likesCount: reel.stats?.likes || likes.length,
          isLiked: likes.includes(uid),
          isSaved: userSavedReels.includes(reel._id.toString()),
          comments: comments,
          commentsCount: reel.stats?.comments || comments.length,
          uid: reel.uid,
          username: reel.username || 'anonymous',
          profileImage: reel.profileImage || '',
          thumbnailUrl: getThumbnailUrl(reel),
          createdAt: reel.createdAt,
          views: views,
          viewers: 0,
          duration: reel.streamData?.duration || reel.duration || 0,
          streamVideoId: reel.streamVideoId,
          isCloudflareStream: !!reel.streamData
        };
      })
    );

    res.status(200).json({ 
      reels: final,
      success: true
    });
  } catch (err) {
    console.error('Error fetching uploaded reels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSavedReels = async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log("💾 Fetching saved reels for user:", uid);
    
    // Get user with savedReels
    const user = await users().findOne({ uid });
    
    if (!user || !user.savedReels || user.savedReels.length === 0) {
      console.log("📭 No saved reels found for user");
      return res.json({ 
        success: true, 
        reels: [],
        message: 'No saved reels found'
      });
    }
    
    console.log(`📚 User has ${user.savedReels.length} saved reel IDs`);
    
    // Convert savedReels to ObjectId if they aren't already
    const savedReelIds = user.savedReels.map(id => {
      if (typeof id === 'string' && ObjectId.isValid(id)) {
        return new ObjectId(id);
      } else if (id instanceof ObjectId) {
        return id;
      } else {
        console.warn(`⚠️ Invalid reel ID in savedReels: ${id}`);
        return null;
      }
    }).filter(id => id !== null);
    
    console.log(`✅ Valid reel IDs to fetch: ${savedReelIds.length}`);
    
    if (savedReelIds.length === 0) {
      return res.json({ 
        success: true, 
        reels: [],
        message: 'No valid saved reels found'
      });
    }
    
    // Fetch saved reels using the IDs from user's savedReels array
    const saved = await reels()
      .find({ 
        _id: { $in: savedReelIds },
        status: { $ne: 'deleted' },
        $or: [
          { 'streamData.status.state': 'ready' },
          { videoUrl: { $exists: true, $ne: null } }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Found ${saved.length} saved reels in database`);

    const final = await Promise.all(
      saved.map(async (reel) => {
        const videoUrl = getVideoUrl(reel);
        const views = await getViewCount(reel._id.toString());
        const likes = Array.isArray(reel.likes) ? reel.likes : [];
        const comments = Array.isArray(reel.comments) ? reel.comments : [];

        return {
          _id: reel._id.toString(),
          videoUrl,
          title: reel.title || '',
          description: reel.description || '',
          hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
          likesCount: reel.stats?.likes || likes.length,
          isLiked: likes.includes(uid),
          isSaved: true, // Always true for saved reels
          commentsCount: reel.stats?.comments || comments.length,
          uid: reel.uid,
          username: reel.username || 'anonymous',
          profileImage: reel.profileImage || '',
          thumbnailUrl: getThumbnailUrl(reel),
          createdAt: reel.createdAt,
          views: views,
          viewers: 0,
          duration: reel.streamData?.duration || reel.duration || 0,
          streamVideoId: reel.streamVideoId,
          isCloudflareStream: !!reel.streamData
        };
      })
    );

    res.status(200).json({ 
      reels: final,
      success: true
    });
  } catch (err) {
    console.error('Error fetching saved reels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single reel by ID
const getReelById = async (req, res) => {
  try {
    const { reelId } = req.params;
    const currentUserUid = req.user?.uid;

    if (!ObjectId.isValid(reelId)) {
      return res.status(400).json({ error: 'Invalid reel ID' });
    }

    const reel = await reels().findOne(
      { _id: new ObjectId(reelId), status: { $ne: 'deleted' } }
    );

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    const videoUrl = getVideoUrl(reel);
    if (!videoUrl) {
      return res.status(404).json({ error: 'Video not available' });
    }

    // Get current user's saved reels to check if this reel is saved
    let isSaved = false;
    if (currentUserUid) {
      const currentUser = await users().findOne({ uid: currentUserUid });
      const userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];
      isSaved = userSavedReels.includes(reelId);
    }

    const views = await getViewCount(reel._id.toString());
    const likes = Array.isArray(reel.likes) ? reel.likes : [];
    const comments = Array.isArray(reel.comments) ? reel.comments : [];

    // Get user info
    const userInfo = await users().findOne(
      { uid: reel.uid },
      { projection: { username: 1, profileImage: 1, isVerified: 1 } }
    );

    const reelData = {
      _id: reel._id.toString(),
      videoUrl,
      title: reel.title || '',
      description: reel.description || '',
      hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
      likesCount: reel.stats?.likes || likes.length,
      isLiked: currentUserUid ? likes.includes(currentUserUid) : false,
      isSaved: isSaved,
      comments: comments,
      commentsCount: reel.stats?.comments || comments.length,
      uid: reel.uid,
      username: userInfo?.username || reel.username || 'anonymous',
      profileImage: userInfo?.profileImage || reel.profileImage || '',
      thumbnailUrl: getThumbnailUrl(reel),
      createdAt: reel.createdAt,
      views: views,
      viewers: 0,
      duration: reel.streamData?.duration || reel.duration || 0,
      streamVideoId: reel.streamVideoId,
      isCloudflareStream: !!reel.streamData,
      user: {
        uid: reel.uid,
        username: userInfo?.username || reel.username || 'anonymous',
        profileImage: userInfo?.profileImage || reel.profileImage || '',
        isVerified: userInfo?.isVerified || false
      }
    };

    return res.status(200).json({ 
      reel: reelData,
      success: true
    });
  } catch (err) {
    console.error('Error fetching reel:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete reel
const deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;

    if (!ObjectId.isValid(reelId)) {
      return res.status(400).json({ error: 'Invalid reel ID' });
    }

    const reel = await reels().findOne({ _id: new ObjectId(reelId) });

    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    if (reel.uid !== uid) {
      return res.status(403).json({ error: 'Unauthorized to delete this reel' });
    }

    // Soft delete - just mark as deleted
    const result = await reels().updateOne(
      { _id: new ObjectId(reelId) },
      { 
        $set: { 
          status: 'deleted',
          deletedAt: new Date(),
          deletedBy: uid
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(500).json({ error: 'Failed to delete reel' });
    }

    // Clean up viewer records
    await viewers().deleteMany({ reelId: reelId });

    // Note: We don't delete from Cloudflare Stream to maintain the video if needed

    return res.status(200).json({ 
      message: 'Reel deleted successfully',
      success: true
    });
  } catch (err) {
    console.error('Error deleting reel:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get uploaded reels by specific user (for viewing other profiles)
const getUploadedReelsByUser = async (req, res) => {
  try {
    const { userId } = req.params; // The user whose reels we want to see
    const currentUserUid = req.user?.uid; // The user making the request

    console.log(`Fetching reels for user: ${userId}, requested by: ${currentUserUid}`);

    // Get current user's saved reels
    let userSavedReels = [];
    if (currentUserUid) {
      const currentUser = await users().findOne({ uid: currentUserUid });
      userSavedReels = currentUser?.savedReels?.map(id => id.toString()) || [];
    }

    const uploaded = await reels()
      .find({ 
        uid: userId, 
        status: { $ne: 'deleted' },
        $or: [
          { 'streamData.status.state': 'ready' },
          { videoUrl: { $exists: true, $ne: null } }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    const final = await Promise.all(
      uploaded.map(async (reel) => {
        const videoUrl = getVideoUrl(reel);
        const views = await getViewCount(reel._id.toString());
        const likes = Array.isArray(reel.likes) ? reel.likes : [];
        const comments = Array.isArray(reel.comments) ? reel.comments : [];

        return {
          _id: reel._id.toString(),
          videoUrl,
          title: reel.title || '',
          description: reel.description || '',
          hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
          likesCount: reel.stats?.likes || likes.length,
          isLiked: currentUserUid ? likes.includes(currentUserUid) : false,
          isSaved: userSavedReels.includes(reel._id.toString()),
          comments: comments,
          commentsCount: reel.stats?.comments || comments.length,
          uid: reel.uid,
          username: reel.username || 'anonymous',
          profileImage: reel.profileImage || '',
          thumbnailUrl: getThumbnailUrl(reel),
          createdAt: reel.createdAt,
          views: views,
          viewers: 0,
          duration: reel.streamData?.duration || reel.duration || 0,
          streamVideoId: reel.streamVideoId,
          isCloudflareStream: !!reel.streamData
        };
      })
    );

    // Filter out any null results (videos that couldn't be processed)
    const validReels = final.filter(reel => reel !== null);

    res.status(200).json({ 
      reels: validReels,
      success: true
    });
  } catch (err) {
    console.error('Error fetching user reels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getReels,
  likeReel,
  saveReel,
  getUploadedReels,
  getSavedReels,
  getReelById,
  deleteReel,
  getUploadedReelsByUser,
};
// controllers/comments.controller.js - Fixed version with proper user data
const { reels, users, comments } = require('../utils/db');
const { ObjectId } = require('mongodb');
const { createNotification } = require('./notifications.controller');

// Get comments with threading
exports.getComments = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { page = 1, limit = 20, sortBy = 'top' } = req.query;
    const { uid } = req.user;
    const skip = (page - 1) * limit;
    
    // Build sort criteria
    let sortCriteria = {};
    switch(sortBy) {
      case 'newest':
        sortCriteria = { createdAt: -1 };
        break;
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'top':
      default:
        sortCriteria = { likeCount: -1, createdAt: -1 };
    }
    
    // Get top-level comments with user data
    const topLevelComments = await comments().aggregate([
      {
        $match: {
          reelId: new ObjectId(reelId),
          parentCommentId: null,
          isDeleted: false
        }
      },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'uid',
          foreignField: 'uid',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' }
    ]).toArray();
    
    // Get count of total top-level comments for pagination
    const totalCount = await comments().countDocuments({
      reelId: new ObjectId(reelId),
      parentCommentId: null,
      isDeleted: false
    });
    
    // Transform comments with replies
    const commentsWithReplies = await Promise.all(
      topLevelComments.map(async (comment) => {
        // Count total replies for this comment
        const totalReplies = await comments().countDocuments({
          parentCommentId: comment._id,
          isDeleted: false
        });
        
        // Get first 3 replies
        const replies = await comments().aggregate([
          {
            $match: {
              parentCommentId: comment._id,
              isDeleted: false
            }
          },
          { $sort: { likeCount: -1, createdAt: -1 } },
          { $limit: 3 },
          {
            $lookup: {
              from: 'users',
              localField: 'uid',
              foreignField: 'uid',
              as: 'userInfo'
            }
          },
          { $unwind: '$userInfo' }
        ]).toArray();
        
        // Transform for frontend with proper user data
        return {
          id: comment._id.toString(),
          text: comment.text,
          uid: comment.uid,
          username: comment.userInfo?.username || comment.user?.username || 'Anonymous',
          profileImage: comment.userInfo?.profileImage || comment.user?.profileImage || `https://i.pravatar.cc/150?u=${comment.uid}`,
          isVerified: comment.userInfo?.isVerified || false,
          likes: comment.likeCount || 0,
          isLiked: comment.likes?.includes(uid) || false,
          replies: replies.map(reply => ({
            id: reply._id.toString(),
            text: reply.text,
            uid: reply.uid,
            username: reply.userInfo?.username || reply.user?.username || 'Anonymous',
            profileImage: reply.userInfo?.profileImage || reply.user?.profileImage || `https://i.pravatar.cc/150?u=${reply.uid}`,
            isVerified: reply.userInfo?.isVerified || false,
            likes: reply.likeCount || 0,
            isLiked: reply.likes?.includes(uid) || false,
            replyToUsername: reply.replyToUsername,
            createdAt: reply.createdAt
          })),
          replyCount: totalReplies,
          hasMoreReplies: totalReplies > 3,
          createdAt: comment.createdAt,
          isEdited: comment.isEdited
        };
      })
    );
    
    res.json({
      comments: commentsWithReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: skip + topLevelComments.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

// Get replies for a specific comment
exports.getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const { uid } = req.user;
    const skip = (page - 1) * limit;
    
    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }
    
    // Get replies with user data
    const replies = await comments().aggregate([
      {
        $match: {
          parentCommentId: new ObjectId(commentId),
          isDeleted: false
        }
      },
      { $sort: { createdAt: 1 } }, // Oldest first for replies
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'uid',
          foreignField: 'uid',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' }
    ]).toArray();
    
    // Get total count for pagination
    const totalCount = await comments().countDocuments({
      parentCommentId: new ObjectId(commentId),
      isDeleted: false
    });
    
    // Transform replies with proper user data
    const transformedReplies = replies.map(reply => ({
      id: reply._id.toString(),
      text: reply.text,
      uid: reply.uid,
      username: reply.userInfo?.username || reply.user?.username || 'Anonymous',
      profileImage: reply.userInfo?.profileImage || reply.user?.profileImage || `https://i.pravatar.cc/150?u=${reply.uid}`,
      isVerified: reply.userInfo?.isVerified || false,
      likes: reply.likeCount || 0,
      isLiked: reply.likes?.includes(uid) || false,
      replyToUsername: reply.replyToUsername,
      createdAt: reply.createdAt,
      isEdited: reply.isEdited
    }));
    
    res.json({
      replies: transformedReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        hasMore: skip + replies.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ error: 'Failed to get replies' });
  }
};

// In comments.controller.js, update the addComment method:

exports.addComment = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { text, parentCommentId, replyToUserId } = req.body;
    const { uid } = req.user;
    
    // Validate
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text required' });
    }
    
    // Get user info from database
    const user = await users().findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if reel exists
    const reel = await reels().findOne({ _id: new ObjectId(reelId) });
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }
    
    // Prepare comment with complete user data
    const comment = {
      _id: new ObjectId(),
      reelId: new ObjectId(reelId),
      uid,
      text: text.trim(),
      parentCommentId: parentCommentId ? new ObjectId(parentCommentId) : null,
      replyToUserId: replyToUserId || null,
      replyToUsername: null,
      likes: [],
      likeCount: 0,
      // Ensure user data is complete
      username: user.username || user.email?.split('@')[0] || 'User',
      profileImage: user.profileImage || `https://i.pravatar.cc/150?u=${user.uid}`,
      isVerified: user.isVerified || false,
      user: {
        uid: user.uid,
        username: user.username || user.email?.split('@')[0] || 'User',
        profileImage: user.profileImage || `https://i.pravatar.cc/150?u=${user.uid}`,
        isVerified: user.isVerified || false
      },
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // If replying to someone, get their username
    if (replyToUserId) {
      const replyToUser = await users().findOne({ uid: replyToUserId });
      if (replyToUser) {
        comment.replyToUsername = replyToUser.username;
      }
    }
    
    // Insert comment
    await comments().insertOne(comment);
    
    // Update parent comment's reply count if this is a reply
    if (parentCommentId) {
      await comments().updateOne(
        { _id: new ObjectId(parentCommentId) },
        { 
          $inc: { replyCount: 1 },
          $set: { updatedAt: new Date() }
        }
      );
    }
    
    // Update reel's comment count
    await reels().updateOne(
      { _id: new ObjectId(reelId) },
      { $inc: { 'stats.comments': 1, commentsCount: 1 } }
    );

    // Format response for frontend
    const responseComment = {
      id: comment._id.toString(),
      _id: comment._id.toString(),
      text: comment.text,
      uid: comment.uid,
      username: comment.username,
      profileImage: comment.profileImage,
      isVerified: comment.isVerified,
      user: comment.user,
      timestamp: comment.createdAt.toISOString(),
      likes: 0,
      isLiked: false,
      parentCommentId: comment.parentCommentId?.toString() || null,
      replyToUsername: comment.replyToUsername,
      createdAt: comment.createdAt.toISOString(),
      replies: [],
      replyCount: 0
    };

    // Emit via WebSocket with complete data
    if (global.websocketService && global.websocketService.io) {
      // Use the emitCommentNew method instead of direct emit
      global.websocketService.emitCommentNew(
        reelId,
        responseComment,
        parentCommentId ? 'reply' : 'comment',
        parentCommentId
      );
    }

    // Create notifications
    if (parentCommentId && replyToUserId && replyToUserId !== uid) {
      await createNotification({
        type: 'reply',
        recipientUid: replyToUserId,
        senderUid: uid,
        senderName: user.username,
        senderImage: user.profileImage,
        reelId: reelId,
        reelTitle: reel.title,
        commentId: comment._id.toString(),
        comment: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        message: `${user.username} replied to your comment`
      });
    } else if (!parentCommentId && reel.uid !== uid) {
      await createNotification({
        type: 'comment',
        recipientUid: reel.uid,
        senderUid: uid,
        senderName: user.username,
        senderImage: user.profileImage,
        reelId: reelId,
        reelTitle: reel.title,
        comment: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        message: `${user.username} commented on your flick`
      });
    }
    
    res.json({ comment: responseComment, success: true });
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Like/unlike comment with WebSocket and notifications - FIXED
exports.likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { uid } = req.user;
    
    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }
    
    const comment = await comments().findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const isLiked = comment.likes?.includes(uid) || false;
    
    await comments().updateOne(
      { _id: new ObjectId(commentId) },
      isLiked ? {
        $pull: { likes: uid },
        $inc: { likeCount: -1 }
      } : {
        $addToSet: { likes: uid },
        $inc: { likeCount: 1 }
      }
    );

    const newLikeCount = comment.likeCount + (isLiked ? -1 : 1);

    // Emit via WebSocket for real-time update
    if (global.websocketService && global.websocketService.io) {
      global.websocketService.io.to(`reel:${comment.reelId}`).emit('comment:liked', {
        commentId: commentId,
        userId: uid,
        isLiked: !isLiked,
        likeCount: newLikeCount,
        parentCommentId: comment.parentCommentId?.toString() || null,
        reelId: comment.reelId.toString()
      });
      
      console.log(`📤 Emitted comment:liked to room reel:${comment.reelId}`);
    }

    // Create notification if liked (not unliked) and it's not the user's own comment
    if (!isLiked && comment.uid !== uid) {
      const liker = await users().findOne({ uid });
      
      await createNotification({
        type: 'comment_like',
        recipientUid: comment.uid,
        senderUid: uid,
        senderName: liker?.username || 'Someone',
        senderImage: liker?.profileImage || '',
        reelId: comment.reelId.toString(),
        commentId: commentId,
        comment: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : ''),
        message: `${liker?.username || 'Someone'} liked your comment`
      });
    }
    
    res.json({ 
      liked: !isLiked,
      likeCount: newLikeCount
    });
    
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
};

// Edit comment
exports.editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const { uid } = req.user;
    
    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }
    
    const comment = await comments().findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    if (comment.uid !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await comments().updateOne(
      { _id: new ObjectId(commentId) },
      {
        $set: {
          text: text.trim(),
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Emit edit via WebSocket
    if (global.websocketService && global.websocketService.io) {
      global.websocketService.io.to(`reel:${comment.reelId}`).emit('comment:edited', {
        commentId: commentId,
        text: text.trim(),
        editedAt: new Date(),
        parentCommentId: comment.parentCommentId?.toString() || null,
        reelId: comment.reelId.toString()
      });
      
      console.log(`📤 Emitted comment:edited to room reel:${comment.reelId}`);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({ error: 'Failed to edit comment' });
  }
};

// Delete comment (soft delete)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { uid } = req.user;
    
    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }
    
    const comment = await comments().findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Allow deletion by comment owner or reel owner
    const reel = await reels().findOne({ _id: comment.reelId });
    if (comment.uid !== uid && reel.uid !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await comments().updateOne(
      { _id: new ObjectId(commentId) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          text: '[Deleted]'
        }
      }
    );
    
    // Update reel comment count
    await reels().updateOne(
      { _id: comment.reelId },
      { $inc: { 'stats.comments': -1 } }
    );
    
    // If this is a reply, update parent comment's reply count
    if (comment.parentCommentId) {
      await comments().updateOne(
        { _id: comment.parentCommentId },
        { $inc: { replyCount: -1 } }
      );
    }

    // Emit deletion via WebSocket
    if (global.websocketService && global.websocketService.io) {
      global.websocketService.io.to(`reel:${comment.reelId}`).emit('comment:deleted', {
        commentId: commentId,
        parentCommentId: comment.parentCommentId?.toString() || null,
        reelId: comment.reelId.toString()
      });
      
      console.log(`📤 Emitted comment:deleted to room reel:${comment.reelId}`);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
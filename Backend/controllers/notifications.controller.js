// controllers/notifications.controller.js
const { notifications, users, reels } = require('../utils/db');
const { ObjectId } = require('mongodb');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const { uid } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    console.log(`📬 Fetching notifications for user: ${uid}, page: ${page}`);
    
    // Get notifications with sender info
    const userNotifications = await notifications().aggregate([
      {
        $match: { 
          recipientUid: uid,
          // Optional: exclude very old notifications
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limit + 1 }, // Get one extra to check if there's more
      {
        $lookup: {
          from: 'users',
          let: { senderUid: '$senderUid' },
          pipeline: [
            { $match: { $expr: { $eq: ['$uid', '$$senderUid'] } } },
            { $project: { username: 1, profileImage: 1, isVerified: 1 } }
          ],
          as: 'senderInfo'
        }
      },
      { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } }
    ]).toArray();
    
    console.log(`📬 Found ${userNotifications.length} notifications`);
    
    // Check if there are more notifications
    const hasMore = userNotifications.length > limit;
    const notificationsToReturn = userNotifications.slice(0, limit);
    
    // Format notifications for frontend
    const formattedNotifications = await Promise.all(
      notificationsToReturn.map(async (notif) => {
        let thumbnailUrl = null;
        
        // Get thumbnail for reel-related notifications
        if (notif.reelId) {
          const reel = await reels().findOne(
            { _id: new ObjectId(notif.reelId) },
            { projection: { thumbnailUrl: 1, streamVideoId: 1 } }
          );
          
          if (reel) {
            thumbnailUrl = reel.thumbnailUrl;
            // If no thumbnail, generate from Cloudflare Stream
            if (!thumbnailUrl && reel.streamVideoId && process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE) {
              thumbnailUrl = `https://customer-${process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${reel.streamVideoId}/thumbnails/thumbnail.jpg`;
            }
          }
        }
        
        return {
          _id: notif._id.toString(),
          type: notif.type,
          from: {
            userId: notif.senderUid,
            username: notif.senderInfo?.username || notif.senderName || 'Unknown',
            profileImage: notif.senderInfo?.profileImage || notif.senderImage || null
          },
          reelId: notif.reelId,
          reelTitle: notif.reelTitle,
          comment: notif.comment || notif.message,
          timestamp: notif.timestamp,
          isRead: notif.isRead || false,
          thumbnailUrl
        };
      })
    );
    
    res.json({
      notifications: formattedNotifications,
      pagination: {
        page,
        limit,
        hasMore
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { uid } = req.user;
    
    console.log(`📖 Marking notification ${notificationId} as read for user ${uid}`);
    
    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const result = await notifications().updateOne(
      { 
        _id: new ObjectId(notificationId),
        recipientUid: uid
      },
      { 
        $set: { 
          isRead: true,
          readAt: new Date()
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log(`✅ Notification marked as read`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`📖 Marking all notifications as read for user ${uid}`);
    
    const result = await notifications().updateMany(
      { 
        recipientUid: uid,
        isRead: false
      },
      { 
        $set: { 
          isRead: true,
          readAt: new Date()
        } 
      }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    
    res.json({ 
      success: true,
      modifiedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const { uid } = req.user;
    
    const count = await notifications().countDocuments({
      recipientUid: uid,
      isRead: false,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    console.log(`📊 User ${uid} has ${count} unread notifications`);
    
    res.json({ count });
    
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { uid } = req.user;
    
    console.log(`🗑️ Deleting notification ${notificationId} for user ${uid}`);
    
    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }
    
    const result = await notifications().deleteOne({
      _id: new ObjectId(notificationId),
      recipientUid: uid
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log(`✅ Notification deleted`);
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Clear all notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log(`🗑️ Clearing all notifications for user ${uid}`);
    
    const result = await notifications().deleteMany({
      recipientUid: uid
    });
    
    console.log(`✅ Deleted ${result.deletedCount} notifications`);
    
    res.json({ 
      success: true,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
};

// Helper function to create notifications (used by other controllers)
exports.createNotification = async (notificationData) => {
  console.log('📩 Creating notification:', {
    type: notificationData.type,
    recipient: notificationData.recipientUid,
    sender: notificationData.senderUid
  });
  
  try {
    const notification = {
      _id: new ObjectId(),
      type: notificationData.type,
      recipientUid: notificationData.recipientUid,
      senderUid: notificationData.senderUid,
      senderName: notificationData.senderName,
      senderImage: notificationData.senderImage,
      reelId: notificationData.reelId,
      reelTitle: notificationData.reelTitle,
      commentId: notificationData.commentId,
      comment: notificationData.comment,
      message: notificationData.message,
      isRead: false,
      timestamp: new Date(),
      createdAt: new Date()
    };
    
    // Insert into database
    const insertResult = await notifications().insertOne(notification);
    console.log(`✅ Notification saved to DB with ID: ${insertResult.insertedId}`);
    
    // Check if WebSocket is available
    console.log('🔌 Checking WebSocket availability...');
    console.log('- global.websocketService exists:', !!global.websocketService);
    console.log('- websocketService.io exists:', !!global.websocketService?.io);
    
    // Emit via WebSocket if available
    if (global.websocketService && global.websocketService.io) {
      const io = global.websocketService.io;
      const rooms = io.sockets.adapter.rooms;
      const userRoom = `user:${notificationData.recipientUid}`;
      
      console.log('🏠 Checking user room:', userRoom);
      console.log('- Room exists:', rooms.has(userRoom));
      
      if (rooms.has(userRoom)) {
        const roomSize = rooms.get(userRoom).size;
        console.log(`- Room has ${roomSize} connection(s)`);
      }
      
      // Emit notification
      io.to(userRoom).emit('notification:new', {
        type: notification.type,
        from: {
          userId: notification.senderUid,
          username: notification.senderName,
          profileImage: notification.senderImage
        },
        reelId: notification.reelId,
        reelTitle: notification.reelTitle,
        comment: notification.comment || notification.message,
        timestamp: notification.timestamp
      });
      
      console.log('✅ Notification emitted via WebSocket to room:', userRoom);
    } else {
      console.log('❌ WebSocket not available for real-time notification');
      console.log('- This is normal if the user is not currently connected');
    }
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Test endpoint to verify notifications are working
exports.testNotification = async (req, res) => {
  try {
    const { targetUid } = req.body;
    const { uid } = req.user;
    
    if (!targetUid) {
      return res.status(400).json({ error: 'targetUid required' });
    }
    
    const user = await users().findOne({ uid });
    
    const testNotification = await exports.createNotification({
      type: 'follow',
      recipientUid: targetUid,
      senderUid: uid,
      senderName: user?.username || 'Test User',
      senderImage: user?.profileImage || '',
      message: 'This is a test notification'
    });
    
    res.json({
      success: true,
      notification: testNotification,
      websocketAvailable: !!global.websocketService?.io
    });
    
  } catch (error) {
    console.error('❌ Error in test notification:', error);
    res.status(500).json({ error: 'Failed to create test notification' });
  }
};
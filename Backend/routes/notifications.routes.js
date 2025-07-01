// routes/notifications.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const notificationsController = require('../controllers/notifications.controller');

// 🔐 Protect all routes
router.use(verifyToken);

// ✅ Get user notifications (paginated)
router.get('/', notificationsController.getNotifications);

// ✅ Get unread notification count
router.get('/unread-count', notificationsController.getUnreadCount);

// ✅ TEST ENDPOINT - Create test notification
router.post('/test', notificationsController.testNotification);

// ✅ Mark a notification as read
router.put('/:notificationId/read', notificationsController.markAsRead);

// ✅ Mark all notifications as read
router.put('/mark-all-read', notificationsController.markAllAsRead);

// ✅ Delete a notification
router.delete('/:notificationId', notificationsController.deleteNotification);

// ✅ Clear all notifications
router.delete('/', notificationsController.clearAllNotifications);

// ✅ Debug endpoint - Check notifications in DB
router.get('/debug/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { notifications } = require('../utils/db');
    
    const count = await notifications().countDocuments({ recipientUid: uid });
    const recent = await notifications()
      .find({ recipientUid: uid })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    res.json({ 
      uid,
      totalCount: count,
      recentNotifications: recent,
      websocketAvailable: !!global.websocketService?.io
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
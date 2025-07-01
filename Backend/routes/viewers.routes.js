// viewers.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const viewersController = require('../controllers/viewers.controller');

// 🔐 Protect all routes
router.use(verifyToken);

// ✅ Register a viewer for a reel
router.post('/:reelId/viewers/register', viewersController.registerViewer);

// ✅ Update heartbeat to maintain active status
router.post('/:reelId/viewers/heartbeat', viewersController.updateHeartbeat);

// ✅ Deregister when viewer stops watching
router.post('/:reelId/viewers/deregister', viewersController.deregisterViewer);

// ✅ Get current viewer count for a reel
router.get('/:reelId/viewers/count', viewersController.getViewerCount);

// ✅ Get all viewer counts (could be admin only)
router.get('/viewers/all', viewersController.getAllViewerCounts);

// ✅ NEW ROUTES FOR ANALYTICS

// Track a new view for analytics
router.post('/:reelId/analytics/track-view', viewersController.trackView);

// Update view duration 
router.post('/:reelId/analytics/update-duration', viewersController.updateViewDuration);

// Get total view count with statistics
router.get('/:reelId/analytics/total-views', viewersController.getTotalViewCount);

// Get views breakdown for charts
router.get('/:reelId/analytics/views-breakdown', viewersController.getViewsBreakdown);

module.exports = router;
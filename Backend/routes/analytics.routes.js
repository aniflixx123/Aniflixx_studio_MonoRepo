// routes/analytics.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const analyticsController = require('../controllers/analytics.controller');

// 🔐 Protect all routes
router.use(verifyToken);

// ✅ GET: Account analytics - This is the only one used by AccountAnalyticsScreen
router.get('/account', analyticsController.getAccountAnalytics);

// These are defined but not used in frontend yet
router.get('/flick/:reelId', analyticsController.getFlickAnalytics);
router.get('/trending', analyticsController.getTrendingAnalytics);

module.exports = router;
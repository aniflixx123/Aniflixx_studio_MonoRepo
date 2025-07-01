// routes/followers.routes.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const followersController = require('../controllers/followers.controller');

// 🔐 Protect all routes
router.use(verifyToken);

// ✅ Follow a user
router.post('/follow/:targetUid', followersController.followUser);

// ✅ Unfollow a user
router.post('/unfollow/:targetUid', followersController.unfollowUser);

// ✅ Check if following a user
router.get('/check/:targetUid', followersController.checkFollowing);

// ✅ Get followers list (public)
router.get('/:targetUid/followers', followersController.getFollowers);

// ✅ Get following list (public)
router.get('/:targetUid/following', followersController.getFollowing);

// ✅ Get suggested users
router.get('/suggestions', followersController.getSuggestedUsers);

module.exports = router;
// routes/social.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
  getFollowers,
  getFollowing,
  checkFollowStatus,
  followUser,
  unfollowUser
} = require('../controllers/social.controller');

/**
 * @route   GET /api/social/:userId/followers
 * @desc    Get paginated followers list
 * @access  Private
 * @query   skip (offset), limit (page size)
 */
router.get('/:userId/followers', verifyToken, getFollowers);

/**
 * @route   GET /api/social/:userId/following
 * @desc    Get paginated following list
 * @access  Private
 * @query   skip (offset), limit (page size)
 */
router.get('/:userId/following', verifyToken, getFollowing);

/**
 * @route   GET /api/social/check/:targetUid
 * @desc    Check if current user follows target user
 * @access  Private
 */
router.get('/check/:targetUid', verifyToken, checkFollowStatus);

/**
 * @route   POST /api/social/follow/:targetUid
 * @desc    Follow a user (uses WebSocket internally)
 * @access  Private
 */
router.post('/follow/:targetUid', verifyToken, followUser);

/**
 * @route   POST /api/social/unfollow/:targetUid
 * @desc    Unfollow a user (uses WebSocket internally)
 * @access  Private
 */
router.post('/unfollow/:targetUid', verifyToken, unfollowUser);

module.exports = router;
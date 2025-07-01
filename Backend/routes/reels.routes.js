// routes/reels.routes.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const reelsController = require('../controllers/reels.controller');

router.use(verifyToken);

// GET: Paginated feed of flicks/reels
router.get('/', reelsController.getReels);

// GET: Current user's uploaded reels
router.get('/uploaded', reelsController.getUploadedReels);

// GET: Specific user's uploaded reels (for viewing other profiles)
router.get('/uploaded/:userId', reelsController.getUploadedReelsByUser);

// GET: Current user's saved reels
router.get('/saved', reelsController.getSavedReels);

// GET: Get a single reel by ID
router.get('/:reelId', reelsController.getReelById);

// POST: Like/unlike a reel
router.post('/:reelId/like', reelsController.likeReel);

// POST: Save/unsave a reel
router.post('/:reelId/save', reelsController.saveReel);

// DELETE: Delete a reel (if owner)
router.delete('/:reelId', reelsController.deleteReel);

module.exports = router;
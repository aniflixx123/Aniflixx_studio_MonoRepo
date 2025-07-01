// routes/comments.routes.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const commentsController = require('../controllers/comments.controller');

// Apply auth middleware to all routes
router.use(verifyToken);

// Get comments for a reel (with pagination)
router.get('/reel/:reelId', commentsController.getComments);

// Get replies for a specific comment (with pagination)
router.get('/reel/:reelId/comment/:commentId/replies', commentsController.getReplies);

// Add a new comment or reply
router.post('/reel/:reelId', commentsController.addComment);

// Like/unlike a comment
router.put('/:commentId/like', commentsController.likeComment);

// Edit a comment
router.put('/:commentId', commentsController.editComment);

// Delete a comment (soft delete)
router.delete('/:commentId', commentsController.deleteComment);

module.exports = router;
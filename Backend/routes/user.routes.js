// user.routes.js - Complete with saved reels and search endpoints
const express = require("express");
const userController = require("../controllers/user.controller");
const verifyToken = require("../middleware/verifyToken");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   GET /api/user/profile
 * @desc    Fetch authenticated user's profile
 * @access  Private
 */
router.get("/profile", verifyToken, userController.getUserProfile);

/**
 * @route   GET /api/user/profile/:userId
 * @desc    Fetch any user's public profile
 * @access  Private (but shows public info)
 */
router.get("/profile/:userId", verifyToken, userController.getPublicProfile);

/**
 * @route   GET /api/user/saved-reels
 * @desc    Fetch authenticated user's saved reels
 * @access  Private
 */
router.get("/saved-reels", verifyToken, userController.getSavedReels);

/**
 * @route   GET /api/user/search
 * @desc    Search users by username or display name
 * @access  Private
 * @query   q (search query), limit (max results, default 20)
 */
router.get("/search", verifyToken, userController.searchUsers);

/**
 * @route   GET /api/user/search/advanced
 * @desc    Advanced search with filters
 * @access  Private
 * @query   q (search query), limit, verified, minFollowers, sortBy
 */
router.get("/search/advanced", verifyToken, userController.advancedSearchUsers);

/**
 * @route   POST /api/user/init
 * @desc    Initialize user in MongoDB after Firebase registration
 * @access  Private
 */
router.post("/init", verifyToken, userController.initUser);

/**
 * @route   PATCH /api/user/update-profile
 * @desc    Update user profile fields like username, bio, or profile image
 * @access  Private
 */
router.patch("/update-profile", verifyToken, userController.updateProfile);

/**
 * @route   POST /api/user/upload-profile-picture
 * @desc    Upload profile picture to Cloudinary
 * @access  Private
 */
router.post("/upload-profile-picture", verifyToken, upload.single("profileImage"), userController.uploadProfilePicture);

module.exports = router;
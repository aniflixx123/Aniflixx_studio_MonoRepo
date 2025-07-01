const express = require("express");
const router = express.Router();
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");
const { uploadProfilePicture } = require("../controllers/profile.controller");

// In-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// 🌟 Add extra logging middleware to double-check token + UID
router.post(
  "/upload-profile-picture",
  verifyToken,
  (req, res, next) => {
    console.log("📢 Middleware - UID from token:", req.user?.uid);
    next();
  },
  upload.single("profileImage"),
  (req, res, next) => {
    if (!req.file) {
      console.error("🚫 No file received in Multer");
    } else {
      console.log("📦 Multer received file:", req.file.originalname);
    }
    next();
  },
  uploadProfilePicture
);

module.exports = router;

const express = require('express');
const uploadController = require('../controllers/upload.controller');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();

// Get upload URL
router.get("/upload-url", (req, res, next) => {
  console.log(">>>> Hit /api/upload/upload-url route");
  next();
}, verifyToken, uploadController.getUploadUrl);


router.get("/upload/upload-url", (req, res, next) => {
  console.log(">>>> Hit /api/upload/upload-url route");
  next();
}, verifyToken, uploadController.getUploadUrl);

router.post("/upload/register", verifyToken, uploadController.registerReel);
router.get("/upload/status/:videoId", verifyToken, uploadController.checkUploadStatus);
router.get('/upload/test', (req, res) => {
  console.log('>>>> /api/upload/test hit');
  res.json({ ok: true, msg: "test works" });
});



module.exports = router;
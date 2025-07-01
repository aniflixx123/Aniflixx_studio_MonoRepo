const { users } = require("../utils/db");
const cloudinary = require("../utils/cloudinaryClient");

exports.uploadProfilePicture = async (req, res) => {
  try {
    const { uid } = req.user;

    console.log("👤 UID from token:", uid);
    console.log("📦 Uploading to Cloudinary:", req.file?.originalname || "No file");

    const existingUser = await users().findOne({ uid });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const base64Image = `data:${req.file.mimetype};base64,${fileBuffer.toString("base64")}`;

    const cloudinaryRes = await cloudinary.uploader.upload(base64Image, {
      folder: "profilepics",
      public_id: `profile_${uid}_${Date.now()}`,
    });

    const update = await users().findOneAndUpdate(
      { uid },
      { $set: { profileImage: cloudinaryRes.secure_url } },
      { returnDocument: "after" }
    );

    return res.status(200).json({
      message: "✅ Profile image updated via Cloudinary",
      profileImage: cloudinaryRes.secure_url,
      user: update.value,
    });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const admin = require("firebase-admin");

// 🔐 Initialize only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or use .cert(serviceAccount) if using JSON key
    storageBucket: "aniflixx-8f61a.appspot.com", // ✅ Firebase Storage bucket
  });
}

// ✅ Firebase services
const auth = admin.auth();
const storage = admin.storage();
const bucket = storage.bucket(); // Public videos can be stored here

// 🔄 Export all needed tools
module.exports = {
  admin,
  auth,
  storage,
  bucket,
  // firestore: admin.firestore(), // Uncomment if needed later
};

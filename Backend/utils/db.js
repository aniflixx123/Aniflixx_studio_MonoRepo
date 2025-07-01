const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI, {
  // Remove deprecated options
  maxPoolSize: 50,       // Increased for handling 10k+ users
  minPoolSize: 10,       // Keep more connections warm
  connectTimeoutMS: 5000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 5000,
  family: 4              // Force IPv4
});

let db = null;
let users = null;
let reels = null;
let viewers = null;
let notifications = null;
let engagements = null;
let analytics = null;      // ADD THIS for analytics tracking
let comments = null; 

async function connectToDatabase() {
  try {
    console.log("🔥 Connecting to MongoDB...");
    await client.connect();
    db = client.db("aniflixx");
    users = db.collection("users");
    reels = db.collection("reels");
    viewers = db.collection("viewers");
    notifications = db.collection("notifications");
    engagements = db.collection("engagements");
    analytics = db.collection("analytics");  // ADD THIS
    comments = db.collection("comments"); 
    
    // Create all necessary indexes for performance
    await createIndexes();
    
    // Initialize missing fields
    await initializeSchemas();
    
    console.log("✅ Connected to MongoDB");
    console.log("🔍 Using Database:", db.databaseName);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

async function createIndexes() {
  console.log('🔄 Setting up performance indexes...');
  
  try {
    // VIEWERS COLLECTION - Critical for real-time performance
    // Option 1: Simple TTL index without partial filter
    await viewers.createIndex(
      { timestamp: 1 },
      { 
        expireAfterSeconds: 60, 
        name: 'timestamp_ttl_idx'
      }
    );
    
    // Option 2: If you need conditional TTL, use a different approach
    // Create an expiresAt field for documents that should expire
    await viewers.createIndex(
      { expiresAt: 1 },
      { 
        expireAfterSeconds: 0, 
        name: 'conditional_ttl_idx',
        sparse: true  // Only index documents with this field
      }
    );
    
    // Compound index for viewer lookups
    await viewers.createIndex(
      { reelId: 1, uid: 1, isAnalyticView: 1 },
      { name: 'reelId_uid_analytics_idx' }
    );
    
    // For counting active viewers
    await viewers.createIndex(
      { reelId: 1, timestamp: -1 },
      { name: 'active_viewers_idx' }
    );
    
    // USERS COLLECTION - Optimized for lookups
    await users.createIndex(
      { uid: 1 },
      { unique: true, name: 'users_uid_idx' }
    );
    
    await users.createIndex(
      { username: 1 },
      { unique: true, name: 'users_username_idx' }
    );
    
    await users.createIndex(
      { email: 1 },
      { unique: true, sparse: true, name: 'users_email_idx' }
    );
    
    // For follower/following queries
    await users.createIndex(
      { followers: 1 },
      { name: 'users_followers_idx' }
    );
    
    await users.createIndex(
      { following: 1 },
      { name: 'users_following_idx' }
    );
    
    // REELS COLLECTION - Optimized for feed and discovery
    await reels.createIndex(
      { uid: 1, createdAt: -1 },
      { name: 'user_reels_by_date' }
    );
    
    await reels.createIndex(
      { createdAt: -1, isActive: 1 },
      { name: 'feed_chronological' }
    );
    
    // For trending/popular content
    await reels.createIndex(
      { 'stats.views': -1, createdAt: -1 },
      { name: 'trending_by_views' }
    );
    
    await reels.createIndex(
      { 'stats.likes': -1, createdAt: -1 },
      { name: 'trending_by_likes' }
    );
    
    // For hashtag discovery
    await reels.createIndex(
      { hashtags: 1, createdAt: -1 },
      { name: 'hashtag_discovery' }
    );
    
    // Compound index for feed algorithm
    await reels.createIndex(
      { isActive: 1, visibility: 1, createdAt: -1 },
      { name: 'feed_algorithm' }
    );
    
    // For user interactions
    await reels.createIndex(
      { likes: 1 },
      { name: 'reels_likes_idx' }
    );
    
    await reels.createIndex(
      { saves: 1 },
      { name: 'reels_saves_idx' }
    );
    
    // NOTIFICATIONS COLLECTION
    await notifications.createIndex(
      { recipientUid: 1, isRead: 1, timestamp: -1 },
      { name: 'user_notifications' }
    );
    
    // Auto-delete old notifications after 30 days
    await notifications.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 2592000, name: 'notifications_ttl' }
    );
    
    // ENGAGEMENTS COLLECTION - For analytics
    await engagements.createIndex(
      { reelId: 1, type: 1, timestamp: -1 },
      { name: 'reel_engagements' }
    );
    
    await engagements.createIndex(
      { uid: 1, type: 1, timestamp: -1 },
      { name: 'user_engagements' }
    );
    
    // ANALYTICS COLLECTION - For detailed tracking
    await analytics.createIndex(
      { type: 1, timestamp: -1 },
      { name: 'analytics_by_type' }
    );
    
    await analytics.createIndex(
      { uid: 1, timestamp: -1 },
      { name: 'analytics_by_user' }
    );
    
    await analytics.createIndex(
      { reelId: 1, type: 1, timestamp: -1 },
      { name: 'analytics_by_reel' }
    );
    
    await analytics.createIndex(
      { sessionId: 1, timestamp: -1 },
      { name: 'analytics_by_session' }
    );
    await reels.createIndex(
      { 'streamData.status.state': 1, status: 1, createdAt: -1 },
      { name: 'stream_ready_reels' }
    );
    
    // For user's saved reels lookup
    await users.createIndex(
      { savedReels: 1 },
      { name: 'user_saved_reels' }
    );
    
    // Compound index for comment queries
    await comments.createIndex(
      { reelId: 1, isDeleted: 1, createdAt: -1 },
      { name: 'reel_active_comments' }
    );
    
    // For viewer analytics
    await viewers.createIndex(
      { reelId: 1, isAnalyticView: 1, timestamp: -1 },
      { name: 'reel_analytics_views' }
    );
    
    // Auto-delete old analytics after 90 days (optional)
    await analytics.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 7776000, name: 'analytics_ttl' }  // 90 days
    );
    
    // COMMENTS COLLECTION
    await comments.createIndex(
      { reelId: 1, createdAt: -1 },
      { name: 'comments_by_reel' }
    );
    
    await comments.createIndex(
      { uid: 1, createdAt: -1 },
      { name: 'comments_by_user' }
    );
    
    await comments.createIndex(
      { parentCommentId: 1 },
      { name: 'comments_replies' }
    );
    
    console.log('✅ All performance indexes created');
  } catch (error) {
    if (error.code === 85) {
      console.log('ℹ️ Some indexes already exist, continuing...');
    } else if (error.code === 67) {
      console.error('❌ Index creation error - trying to fix...');
      // Try to drop problematic indexes and recreate
      try {
        await viewers.dropIndex('timestamp_ttl_idx').catch(() => {});
        await viewers.createIndex(
          { timestamp: 1 },
          { 
            expireAfterSeconds: 60, 
            name: 'timestamp_ttl_idx'
          }
        );
        console.log('✅ Fixed TTL index');
      } catch (fixError) {
        console.log('ℹ️ Could not fix index:', fixError.message);
      }
    } else {
      console.error('❌ Index creation error:', error);
      throw error;
    }
  }
}

async function initializeSchemas() {
  console.log('🔄 Initializing schemas...');
  
  // Update users schema
  await users.updateMany(
    {},
    { 
      $setOnInsert: { 
        isVerified: false,
        followers: [],
        following: [],
        uploadedReels: [],
        savedReels: [],
        stats: {
          totalReels: 0,
          totalViews: 0,
          totalLikes: 0,
          totalFollowers: 0,
          totalFollowing: 0
        },
        preferences: {
          notifications: {
            likes: true,
            comments: true,
            follows: true,
            mentions: true
          },
          privacy: {
            isPrivate: false,
            allowMessages: true
          }
        },
        isOnline: false,
        lastSeen: new Date()
      } 
    },
    { upsert: false }
  );
  
  // Update reels schema
  await reels.updateMany(
    {},
    { 
      $setOnInsert: {
        thumbnailUrl: null,
        stats: {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          completions: 0,
          replays: 0
        },
        likes: [],
        saves: [],
        isActive: true,
        status: 'active',
        visibility: 'public',
        hashtags: [],
        mentions: []
      }
    },
    { upsert: false }
  );
  
  console.log('✅ Schema initialization complete');
}

// Connection health check
async function checkConnection() {
  try {
    await client.db().admin().ping();
    return true;
  } catch (error) {
    console.error('❌ MongoDB health check failed:', error);
    return false;
  }
}

// Graceful shutdown
async function closeConnection() {
  try {
    await client.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
}

// Safety checkers with better error messages
function getUsersCollection() {
  if (!users) throw new Error("❗ Users collection not initialized. Call connectToDatabase() first.");
  return users;
}

function getReelsCollection() {
  if (!reels) throw new Error("❗ Reels collection not initialized. Call connectToDatabase() first.");
  return reels;
}

function getViewersCollection() {
  if (!viewers) throw new Error("❗ Viewers collection not initialized. Call connectToDatabase() first.");
  return viewers;
}

function getNotificationsCollection() {
  if (!notifications) throw new Error("❗ Notifications collection not initialized. Call connectToDatabase() first.");
  return notifications;
}

function getEngagementsCollection() {
  if (!engagements) throw new Error("❗ Engagements collection not initialized. Call connectToDatabase() first.");
  return engagements;
}

function getAnalyticsCollection() {  // ADD THIS
  if (!analytics) throw new Error("❗ Analytics collection not initialized. Call connectToDatabase() first.");
  return analytics;
}

function getCommentsCollection() {
  if (!comments) throw new Error("❗ Comments collection not initialized. Call connectToDatabase() first.");
  return comments;
}

// Export aggregation helpers for common queries
const aggregationHelpers = {
  // Get user with stats
  async getUserWithStats(uid) {
    const [user] = await users.aggregate([
      { $match: { uid } },
      {
        $lookup: {
          from: 'reels',
          localField: 'uid',
          foreignField: 'uid',
          as: 'userReels'
        }
      },
      {
        $addFields: {
          'stats.totalReels': { $size: '$userReels' },
          'stats.totalFollowers': { $size: '$followers' },
          'stats.totalFollowing': { $size: '$following' }
        }
      },
      {
        $project: {
          userReels: 0,
          password: 0
        }
      }
    ]).toArray();
    
    return user;
  },
  
  // Get reel with user data
  async getReelWithUser(reelId) {
    const [reel] = await reels.aggregate([
      { $match: { _id: reelId } },
      {
        $lookup: {
          from: 'users',
          localField: 'uid',
          foreignField: 'uid',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
          'user.email': 0
        }
      }
    ]).toArray();
    
    return reel;
  }
};

// Helper function to handle conditional expiration
async function createViewerDocument(viewerData) {
  const doc = {
    ...viewerData,
    timestamp: new Date()
  };
  
  // If it's NOT an analytic view, add expiresAt for auto-deletion
  if (!viewerData.isAnalyticView) {
    doc.expiresAt = new Date(Date.now() + 60000); // Expire in 60 seconds
  }
  
  return await viewers.insertOne(doc);
}

module.exports = {
  connectToDatabase,
  checkConnection,
  closeConnection,
  db: () => db,
  users: getUsersCollection,
  reels: getReelsCollection,
  viewers: getViewersCollection,
  notifications: getNotificationsCollection,
  engagements: getEngagementsCollection,
  analytics: getAnalyticsCollection,  // ADD THIS
  comments: getCommentsCollection,
  aggregationHelpers,
  createViewerDocument  // Export helper for conditional TTL
};
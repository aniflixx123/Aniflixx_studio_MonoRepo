// user.controller.js - Complete version with saved reels functionality
const { users, reels, viewers } = require("../utils/db");
const { ObjectId } = require('mongodb');
const cloudinary = require("../utils/cloudinaryClient");
const cloudflareImages = require("../utils/cloudflareImagesService");

const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;

    console.log("📱 Getting profile for UID:", uid);

    const user = await users().findOne({ uid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Convert ObjectId savedReels to strings for frontend
    const safeUser = {
      ...user,
      savedReels: user.savedReels?.map(id => id.toString()) || [],
      password: undefined // Remove sensitive data
    };

    console.log(`✅ Profile fetched: ${user.username}, savedReels: ${safeUser.savedReels.length}`);

    return res.status(200).json({ 
      user: safeUser,
      success: true
    });
  } catch (err) {
    console.error("❌ Error fetching user profile:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get public profile of any user
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUid = req.user?.uid;

    console.log("👤 Getting public profile for:", userId);
    console.log("👁️ Requested by:", requestingUid);

    // Find user by uid
    const user = await users().findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if requesting user is following this user
    const isFollowing = user.followers?.includes(requestingUid) || false;

    // Get public data only
    const publicProfile = {
      _id: user._id,
      uid: user.uid,
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio || '',
      profileImage: user.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username || uid}`,
      customStatus: user.customStatus || '',
      isVerified: user.isVerified || false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      createdAt: user.createdAt,
      // Don't expose savedReels for other users
    };

    return res.status(200).json({ 
      user: publicProfile,
      isFollowing,
      success: true
    });
  } catch (err) {
    console.error("❌ Error fetching public profile:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get saved reels for authenticated user
const getSavedReels = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    console.log("💾 Fetching saved reels for user:", userId);
    
    // Get user with savedReels
    const user = await users().findOne({ uid: userId });
    
    if (!user || !user.savedReels || user.savedReels.length === 0) {
      console.log("📭 No saved reels found for user");
      return res.json({ 
        success: true, 
        reels: [],
        message: 'No saved reels found'
      });
    }
    
    console.log(`📚 User has ${user.savedReels.length} saved reel IDs`);
    
    // Convert savedReels to ObjectId if they aren't already
    const savedReelIds = user.savedReels.map(id => {
      if (typeof id === 'string' && ObjectId.isValid(id)) {
        return new ObjectId(id);
      } else if (id instanceof ObjectId) {
        return id;
      } else {
        console.warn(`⚠️ Invalid reel ID in savedReels: ${id}`);
        return null;
      }
    }).filter(id => id !== null);
    
    console.log(`✅ Valid reel IDs to fetch: ${savedReelIds.length}`);
    
    // Fetch all saved reels with creator info
    const savedReelDocs = await reels()
      .find({ 
        _id: { $in: savedReelIds },
        status: { $ne: 'deleted' }
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`📺 Found ${savedReelDocs.length} saved reels in database`);
    
    // Process reels with user info
    const processedReels = await Promise.all(
      savedReelDocs.map(async (reel) => {
        // Get creator info
        const creator = await users().findOne(
          { uid: reel.uid },
          { projection: { username: 1, profileImage: 1, isVerified: 1 } }
        );
        
        // Get video URL
        const videoUrl = getVideoUrl(reel);
        const thumbnailUrl = getThumbnailUrl(reel);
        
        return {
          _id: reel._id.toString(),
          uid: reel.uid || '',
          username: creator?.username || reel.username || 'anonymous',
          profileImage: creator?.profileImage || reel.profileImage || '',
          title: reel.title || '',
          description: reel.description || '',
          hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
          videoUrl,
          thumbnailUrl,
          streamVideoId: reel.streamVideoId,
          duration: reel.streamData?.duration || reel.duration || 0,
          likesCount: reel.stats?.likes || reel.likes?.length || 0,
          isLiked: reel.likes?.includes(userId) || false,
          savesCount: reel.stats?.saves || reel.saves?.length || 0,
          isSaved: true, // Always true for saved reels
          commentsCount: reel.stats?.comments || 0,
          views: reel.stats?.views || reel.views || 0,
          createdAt: reel.createdAt,
          user: {
            uid: reel.uid,
            username: creator?.username || reel.username || 'anonymous',
            profileImage: creator?.profileImage || reel.profileImage || '',
            isVerified: creator?.isVerified || false
          }
        };
      })
    );
    
    res.json({
      success: true,
      reels: processedReels,
      count: processedReels.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching saved reels:", error);
    res.status(500).json({ 
      error: "Failed to fetch saved reels",
      message: error.message 
    });
  }
};

// Helper functions
function getVideoUrl(reel) {
  if (reel.streamData?.playback?.hls) {
    return reel.streamData.playback.hls;
  }
  if (reel.streamData?.preview) {
    return reel.streamData.preview;
  }
  if (reel.videoUrl) {
    return reel.videoUrl;
  }
  if (reel.streamVideoId) {
    return `https://customer-kwy8lcu4xp67nayh.cloudflarestream.com/${reel.streamVideoId}/manifest/video.m3u8`;
  }
  return null;
}

function getThumbnailUrl(reel) {
  if (reel.thumbnailUrl) {
    return reel.thumbnailUrl;
  }
  if (reel.streamVideoId) {
    return `https://customer-kwy8lcu4xp67nayh.cloudflarestream.com/${reel.streamVideoId}/thumbnails/thumbnail.jpg`;
  }
  return `https://via.placeholder.com/640x360/1a1a1a/4285F4?text=${encodeURIComponent((reel.title || 'Video').substring(0, 20))}`;
}

const initUser = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { username, profileImage } = req.body;

    console.log("🔄 Initializing user:", { uid, email, username });

    const existingUser = await users().findOne({ uid });

    if (existingUser) {
      return res.status(200).json({ 
        message: "User already exists",
        user: existingUser,
        isNew: false
      });
    }

    // Check if username is taken
    if (username) {
      const usernameTaken = await users().findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      });
      
      if (usernameTaken) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    const newUser = {
      uid,
      email,
      username: username || email?.split('@')[0] || `user_${Date.now()}`,
      profileImage: profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username || uid}`,
      bio: '',
      displayName: '',
      customStatus: '',
      isVerified: false,
      followers: [],
      following: [],
      uploadedReels: [],
      savedReels: [], // Initialize as empty array
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
      lastSeen: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users().insertOne(newUser);

    if (result.insertedId) {
      const insertedUser = await users().findOne({ _id: result.insertedId });
      return res.status(201).json({ 
        message: "User initialized successfully",
        user: insertedUser,
        isNew: true
      });
    }

    throw new Error("Failed to create user");
  } catch (err) {
    console.error("❌ Error initializing user:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { username, bio, displayName, customStatus, profileImage } = req.body;

    console.log("📝 Updating profile for:", uid);
    console.log("📦 Update data:", { username, bio, displayName, customStatus, profileImage });

    const updates = {};
    
    // Validate and add updates
    if (username !== undefined) {
      // Check if username is taken by another user
      const existingUser = await users().findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') },
        uid: { $ne: uid }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      updates.username = username;
    }
    
    if (bio !== undefined) updates.bio = bio;
    if (displayName !== undefined) updates.displayName = displayName;
    if (customStatus !== undefined) updates.customStatus = customStatus;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    
    updates.updatedAt = new Date();

    // First check if user exists
    const userExists = await users().findOne({ uid });
    if (!userExists) {
      console.log("❌ User not found with uid:", uid);
      return res.status(404).json({ error: "User not found" });
    }

    // Perform the update
    const result = await users().findOneAndUpdate(
      { uid },
      { $set: updates },
      { returnDocument: 'after' }
    );

    // Check different possible response formats
    const updatedUser = result.value || result;
    
    if (!updatedUser) {
      console.log("❌ Update failed - no result returned");
      return res.status(404).json({ error: "User not found" });
    }

    // Remove sensitive data
    const { password, ...safeUser } = updatedUser;

    console.log("✅ Profile updated successfully:", safeUser.username);

    return res.status(200).json({ 
      message: "Profile updated successfully",
      user: safeUser,
      success: true
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const { uid } = req.user;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload to Cloudflare Images
    const result = await cloudflareImages.uploadImage(
      req.file.buffer,
      `profile_${uid}_${Date.now()}.jpg`
    );

    // Update user in MongoDB
    const update = await users().findOneAndUpdate(
      { uid },
      { $set: { profileImage: result.url } },
      { returnDocument: "after" }
    );

    return res.status(200).json({
      message: "Profile image updated",
      profileImage: result.url,
      user: update.value,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
};

// Add this function to your user.controller.js file

const searchUsers = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const requestingUid = req.user?.uid;
    
    console.log("🔍 Searching users with query:", q);
    console.log("👤 Requested by:", requestingUid);
    
    // Validate query - must have actual content
    if (!q || typeof q !== 'string' || !q.trim() || q.trim().length < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 1 character',
        results: [] 
      });
    }

    // Sanitize and prepare search query
    const sanitizedQuery = q.trim();
    const searchRegex = new RegExp(sanitizedQuery, 'i');
    
    // Search users by username or displayName
    // Exclude the requesting user from results
    const searchResults = await users()
      .find({
        $and: [
          {
            $or: [
              { username: searchRegex },
              { displayName: searchRegex }
            ]
          },
          { uid: { $ne: requestingUid } } // Exclude self from search
        ]
      })
      .project({
        uid: 1,
        username: 1,
        displayName: 1,
        profileImage: 1,
        bio: 1,
        isVerified: 1,
        followers: 1,
        following: 1
      })
      .limit(parseInt(limit))
      .toArray();

    console.log(`📊 Found ${searchResults.length} users matching "${q}"`);

    // Transform results and calculate follower counts
    const results = searchResults.map(user => ({
      _id: user._id.toString(),
      uid: user.uid,
      username: user.username,
      displayName: user.displayName || user.username,
      profileImage: user.profileImage || 'https://aniflixx.com/default-user.jpg',
      bio: user.bio || '',
      isVerified: user.isVerified || false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      // Check if requesting user follows this user
      isFollowing: user.followers?.includes(requestingUid) || false
    }));

    // Sort by relevance and popularity
    results.sort((a, b) => {
      // Exact username match first
      const aExactMatch = a.username.toLowerCase() === q.toLowerCase();
      const bExactMatch = b.username.toLowerCase() === q.toLowerCase();
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Then by follower count
      return b.followersCount - a.followersCount;
    });

    res.json({
      success: true,
      results,
      count: results.length,
      query: q
    });

  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search users',
      message: error.message 
    });
  }
};

// Advanced search with more options (optional enhancement)
const advancedSearchUsers = async (req, res) => {
  try {
    const { 
      q, 
      limit = 20, 
      verified = false,
      minFollowers = 0,
      sortBy = 'relevance' // relevance, followers, newest
    } = req.query;
    
    const requestingUid = req.user?.uid;
    
    console.log("🔍 Advanced search:", { q, verified, minFollowers, sortBy });
    
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 1 character' 
      });
    }

    // Build search query
    const searchRegex = new RegExp(q.trim(), 'i');
    const searchQuery = {
      $and: [
        {
          $or: [
            { username: searchRegex },
            { displayName: searchRegex },
            { bio: searchRegex } // Also search in bio
          ]
        },
        { uid: { $ne: requestingUid } }
      ]
    };

    // Add filters
    if (verified === 'true') {
      searchQuery.$and.push({ isVerified: true });
    }

    // Sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'followers':
        sortOptions = { followersCount: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        // For relevance, we'll sort after fetching
        sortOptions = {};
    }

    const searchResults = await users()
      .find(searchQuery)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .toArray();

    // Filter by minimum followers if specified
    const filteredResults = searchResults.filter(user => 
      (user.followers?.length || 0) >= parseInt(minFollowers)
    );

    console.log(`📊 Advanced search found ${filteredResults.length} users`);

    // Transform results
    const results = filteredResults.map(user => ({
      _id: user._id.toString(),
      uid: user.uid,
      username: user.username,
      displayName: user.displayName || user.username,
      profileImage: user.profileImage || 'https://aniflixx.com/default-user.jpg',
      bio: user.bio || '',
      isVerified: user.isVerified || false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      isFollowing: user.followers?.includes(requestingUid) || false,
      createdAt: user.createdAt
    }));

    // Sort by relevance if requested
    if (sortBy === 'relevance') {
      results.sort((a, b) => {
        const searchLower = q.toLowerCase();
        
        // Exact username match
        const aExactUsername = a.username.toLowerCase() === searchLower;
        const bExactUsername = b.username.toLowerCase() === searchLower;
        if (aExactUsername && !bExactUsername) return -1;
        if (!aExactUsername && bExactUsername) return 1;
        
        // Username starts with query
        const aStartsWith = a.username.toLowerCase().startsWith(searchLower);
        const bStartsWith = b.username.toLowerCase().startsWith(searchLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Then by follower count
        return b.followersCount - a.followersCount;
      });
    }

    res.json({
      success: true,
      results,
      count: results.length,
      query: q,
      filters: { verified, minFollowers, sortBy }
    });

  } catch (error) {
    console.error("❌ Advanced search error:", error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search users',
      message: error.message 
    });
  }
};

// Export the new functions along with existing ones
module.exports = {
  getUserProfile,
  getPublicProfile,
  getSavedReels,
  initUser,
  updateProfile,
  uploadProfilePicture,
  searchUsers,           // Add this
  advancedSearchUsers   // Add this (optional)
};
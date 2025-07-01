// controllers/followers.controller.js

const { users } = require('../utils/db');
const { ObjectId } = require('mongodb');
const { createNotification } = require('./notifications.controller');

// Follow a user
exports.followUser = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { uid } = req.user;
    
    // Can't follow yourself
    if (targetUid === uid) {
      return res.status(400).json({ error: "Can't follow yourself" });
    }
    
    // Find both users
    const currentUser = await users().findOne({ uid });
    const targetUser = await users().findOne({ uid: targetUid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize arrays if they don't exist
    if (!currentUser.following) {
      currentUser.following = [];
    }
    if (!targetUser.followers) {
      targetUser.followers = [];
    }
    
    // Check if already following
    const alreadyFollowing = currentUser.following.includes(targetUid);
    
    if (alreadyFollowing) {
      return res.status(400).json({ 
        error: 'Already following this user',
        following: true 
      });
    }
    
    // Update current user's following list
    const currentUserUpdate = await users().findOneAndUpdate(
      { uid },
      { 
        $addToSet: { following: targetUid },
        $inc: { followingCount: 1 }
      },
      { returnDocument: 'after' }
    );
    
    // Update target user's followers list
    const targetUserUpdate = await users().findOneAndUpdate(
      { uid: targetUid },
      { 
        $addToSet: { followers: uid },
        $inc: { followersCount: 1 }
      },
      { returnDocument: 'after' }
    );
    
    // Create a notification for the followed user
    try {
      await createNotification({
        type: 'follow',
        recipientUid: targetUid,
        senderUid: uid,
        senderName: currentUser.username,
        senderImage: currentUser.profileImage,
        message: `${currentUser.username} started following you`
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the follow operation if notification fails
    }
    
    // Calculate counts safely
    const followersCount = targetUserUpdate?.value?.followersCount || 
                          targetUserUpdate?.value?.followers?.length || 
                          targetUser.followers.length + 1;
    const followingCount = currentUserUpdate?.value?.followingCount || 
                          currentUserUpdate?.value?.following?.length || 
                          currentUser.following.length + 1;
    
    res.status(200).json({
      success: true,
      following: true,
      followersCount: followersCount,
      followingCount: followingCount
    });
  } catch (err) {
    console.error('❌ Error following user:', err);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

// Unfollow a user
exports.unfollowUser = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { uid } = req.user;
    
    // Can't unfollow yourself
    if (targetUid === uid) {
      return res.status(400).json({ error: "Can't unfollow yourself" });
    }
    
    // Find both users to check they exist
    const currentUser = await users().findOne({ uid });
    const targetUser = await users().findOne({ uid: targetUid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize arrays if they don't exist
    if (!currentUser.following) {
      currentUser.following = [];
    }
    if (!targetUser.followers) {
      targetUser.followers = [];
    }
    
    // Check if actually following
    const isFollowing = currentUser.following.includes(targetUid);
    
    if (!isFollowing) {
      return res.status(400).json({ 
        error: 'Not following this user',
        following: false 
      });
    }
    
    // Update current user's following list
    const currentUserUpdate = await users().findOneAndUpdate(
      { uid },
      { 
        $pull: { following: targetUid },
        $inc: { followingCount: -1 }
      },
      { returnDocument: 'after' }
    );
    
    // Update target user's followers list
    const targetUserUpdate = await users().findOneAndUpdate(
      { uid: targetUid },
      { 
        $pull: { followers: uid },
        $inc: { followersCount: -1 }
      },
      { returnDocument: 'after' }
    );
    
    // Calculate counts safely
    const followersCount = targetUserUpdate?.value?.followersCount || 
                          targetUserUpdate?.value?.followers?.length || 
                          Math.max(0, targetUser.followers.length - 1);
    const followingCount = currentUserUpdate?.value?.followingCount || 
                          currentUserUpdate?.value?.following?.length || 
                          Math.max(0, currentUser.following.length - 1);
    
    res.status(200).json({
      success: true,
      following: false,
      followersCount: followersCount,
      followingCount: followingCount
    });
  } catch (err) {
    console.error('❌ Error unfollowing user:', err);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

// Check if following a user
exports.checkFollowing = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { uid } = req.user;
    
    const currentUser = await users().findOne({ uid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isFollowing = currentUser.following && 
      currentUser.following.includes(targetUid);
    
    res.status(200).json({
      following: isFollowing || false
    });
  } catch (err) {
    console.error('❌ Error checking follow status:', err);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
};

// Get followers list
exports.getFollowers = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    // First get the user's followers array
    const targetUser = await users().findOne(
      { uid: targetUid },
      { projection: { followers: 1, followersCount: 1 } }
    );
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!targetUser.followers || targetUser.followers.length === 0) {
      return res.status(200).json({ 
        followers: [],
        total: 0,
        hasMore: false
      });
    }
    
    // Get subset of followers based on limit/skip
    const followerUids = targetUser.followers.slice(
      parseInt(skip),
      parseInt(skip) + parseInt(limit)
    );
    
    // Fetch the user details for each follower
    const followers = await users()
      .find({ uid: { $in: followerUids } })
      .project({
        uid: 1,
        username: 1,
        profileImage: 1,
        isVerified: 1,
        bio: 1
      })
      .toArray();
    
    // Maintain the order from the original array
    const orderedFollowers = followerUids.map(uid => 
      followers.find(f => f.uid === uid)
    ).filter(Boolean);
    
    res.status(200).json({
      followers: orderedFollowers,
      total: targetUser.followersCount || targetUser.followers.length,
      hasMore: targetUser.followers.length > (parseInt(skip) + parseInt(limit))
    });
  } catch (err) {
    console.error('❌ Error getting followers list:', err);
    res.status(500).json({ error: 'Failed to get followers' });
  }
};

// Get following list
exports.getFollowing = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { limit = 20, skip = 0 } = req.query;
    
    // First get the user's following array
    const targetUser = await users().findOne(
      { uid: targetUid },
      { projection: { following: 1, followingCount: 1 } }
    );
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!targetUser.following || targetUser.following.length === 0) {
      return res.status(200).json({ 
        following: [],
        total: 0,
        hasMore: false
      });
    }
    
    // Get subset of following based on limit/skip
    const followingUids = targetUser.following.slice(
      parseInt(skip),
      parseInt(skip) + parseInt(limit)
    );
    
    // Fetch the user details for each followed user
    const following = await users()
      .find({ uid: { $in: followingUids } })
      .project({
        uid: 1,
        username: 1,
        profileImage: 1,
        isVerified: 1,
        bio: 1
      })
      .toArray();
    
    // Maintain the order from the original array
    const orderedFollowing = followingUids.map(uid => 
      following.find(f => f.uid === uid)
    ).filter(Boolean);
    
    res.status(200).json({
      following: orderedFollowing,
      total: targetUser.followingCount || targetUser.following.length,
      hasMore: targetUser.following.length > (parseInt(skip) + parseInt(limit))
    });
  } catch (err) {
    console.error('❌ Error getting following list:', err);
    res.status(500).json({ error: 'Failed to get following' });
  }
};

// Get suggested users to follow (not currently followed)
exports.getSuggestedUsers = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 10 } = req.query;
    
    // Get current user with following list
    const currentUser = await users().findOne({ uid });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get users not followed by current user
    // Exclude current user from results
    const suggestedUsers = await users()
      .find({
        uid: { 
          $nin: [...(currentUser.following || []), uid] 
        }
      })
      .project({
        uid: 1,
        username: 1,
        profileImage: 1,
        isVerified: 1,
        bio: 1,
        followers: 1,
        followersCount: 1
      })
      .sort({ followersCount: -1 }) // Sort by follower count (most popular first)
      .limit(parseInt(limit))
      .toArray();
    
    // Format the response
    const formattedUsers = suggestedUsers.map(user => ({
      uid: user.uid,
      username: user.username,
      profileImage: user.profileImage,
      isVerified: user.isVerified || false,
      bio: user.bio || '',
      followersCount: user.followersCount || user.followers?.length || 0
    }));
    
    res.status(200).json({
      suggestions: formattedUsers
    });
  } catch (err) {
    console.error('❌ Error getting suggested users:', err);
    res.status(500).json({ error: 'Failed to get suggested users' });
  }
};
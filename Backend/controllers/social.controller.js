// controllers/social.controller.js
const { users } = require('../utils/db');
const { createNotification } = require('./notifications.controller');

// Get followers list with pagination
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { skip = 0, limit = 20 } = req.query;
    const requestingUid = req.user.uid;
    
    console.log(`👥 Getting followers for user: ${userId}, skip: ${skip}, limit: ${limit}`);
    
    // Get the user
    const user = await users().findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get total count
    const totalFollowers = user.followers?.length || 0;
    
    // Get paginated follower IDs
    const followerIds = (user.followers || [])
      .slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    
    if (followerIds.length === 0) {
      return res.json({ 
        followers: [],
        totalCount: totalFollowers,
        hasMore: false
      });
    }
    
    // Fetch follower details
    const followers = await users()
      .find({ uid: { $in: followerIds } })
      .project({ 
        _id: 1, 
        uid: 1, 
        username: 1, 
        profileImage: 1, 
        isVerified: 1,
        bio: 1
      })
      .toArray();
    
    // Get current user's following list to check follow status
    let currentUserFollowing = [];
    if (requestingUid) {
      const currentUser = await users().findOne({ uid: requestingUid });
      currentUserFollowing = currentUser?.following || [];
    }
    
    // Map followers with follow status
    const followersWithStatus = followers.map(follower => ({
      uid: follower.uid,
      username: follower.username,
      profileImage: follower.profileImage || 'https://aniflixx.com/default-user.jpg',
      isVerified: follower.isVerified || false,
      bio: follower.bio || '',
      isFollowing: currentUserFollowing.includes(follower.uid)
    }));
    
    console.log(`✅ Returning ${followersWithStatus.length} followers out of ${totalFollowers} total`);
    
    res.json({ 
      followers: followersWithStatus,
      totalCount: totalFollowers,
      hasMore: (parseInt(skip) + followersWithStatus.length) < totalFollowers
    });
    
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
};

// Get following list with pagination
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const { skip = 0, limit = 20 } = req.query;
    const requestingUid = req.user.uid;
    
    console.log(`👥 Getting following for user: ${userId}, skip: ${skip}, limit: ${limit}`);
    
    // Get the user
    const user = await users().findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get total count
    const totalFollowing = user.following?.length || 0;
    
    // Get paginated following IDs
    const followingIds = (user.following || [])
      .slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    
    if (followingIds.length === 0) {
      return res.json({ 
        following: [],
        totalCount: totalFollowing,
        hasMore: false
      });
    }
    
    // Fetch following details
    const following = await users()
      .find({ uid: { $in: followingIds } })
      .project({ 
        _id: 1, 
        uid: 1, 
        username: 1, 
        profileImage: 1, 
        isVerified: 1,
        bio: 1
      })
      .toArray();
    
    // Get current user's following list to check follow status
    let currentUserFollowing = [];
    if (requestingUid) {
      const currentUser = await users().findOne({ uid: requestingUid });
      currentUserFollowing = currentUser?.following || [];
    }
    
    // Map following with follow status
    const followingWithStatus = following.map(user => ({
      uid: user.uid,
      username: user.username,
      profileImage: user.profileImage || 'https://aniflixx.com/default-user.jpg',
      isVerified: user.isVerified || false,
      bio: user.bio || '',
      isFollowing: currentUserFollowing.includes(user.uid)
    }));
    
    console.log(`✅ Returning ${followingWithStatus.length} following out of ${totalFollowing} total`);
    
    res.json({ 
      following: followingWithStatus,
      totalCount: totalFollowing,
      hasMore: (parseInt(skip) + followingWithStatus.length) < totalFollowing
    });
    
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
};

// Check if current user follows target user
const checkFollowStatus = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const currentUid = req.user.uid;
    
    if (currentUid === targetUid) {
      return res.json({ following: false });
    }
    
    const currentUser = await users().findOne({ uid: currentUid });
    const isFollowing = currentUser?.following?.includes(targetUid) || false;
    
    res.json({ following: isFollowing });
    
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
};

// Follow user via HTTP
const followUser = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const currentUid = req.user.uid;
    
    console.log(`👥 HTTP Follow: ${currentUid} following ${targetUid}`);
    
    if (currentUid === targetUid) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      users().findOne({ uid: currentUid }),
      users().findOne({ uid: targetUid })
    ]);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    // Check if already following
    if (currentUser.following?.includes(targetUid)) {
      return res.status(400).json({ 
        error: 'Already following this user',
        following: true,
        followersCount: targetUser.followersCount || targetUser.followers?.length || 0,
        followingCount: currentUser.followingCount || currentUser.following?.length || 0
      });
    }
    
    // Update both users
    await users().updateOne(
      { uid: currentUid },
      { 
        $addToSet: { following: targetUid },
        $set: { followingCount: (currentUser.following?.length || 0) + 1 }
      }
    );
    
    await users().updateOne(
      { uid: targetUid },
      { 
        $addToSet: { followers: currentUid },
        $set: { followersCount: (targetUser.followers?.length || 0) + 1 }
      }
    );
    
    // Get updated counts
    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      users().findOne({ uid: currentUid }),
      users().findOne({ uid: targetUid })
    ]);
    
    // Create notification
    await createNotification({
      type: 'follow',
      recipientUid: targetUid,
      senderUid: currentUid,
      senderName: currentUser.username,
      senderImage: currentUser.profileImage,
      message: `${currentUser.username} started following you`
    });
    
    // Emit WebSocket events if available
    try {
      const wsService = require('../services/websocket.service');
      const io = wsService.getIO();
      
      if (io) {
        // Emit to the follower
        io.to(`user:${currentUid}`).emit('user:follow:ack', {
          userId: currentUid,
          targetUserId: targetUid,
          following: true
        });
        
        // Emit to the target user
        io.to(`user:${targetUid}`).emit('profile:follower:new', {
          userId: currentUid,
          targetUserId: targetUid,
          follower: {
            uid: currentUid,
            username: currentUser.username,
            profileImage: currentUser.profileImage,
            isVerified: currentUser.isVerified
          }
        });
        
        // Emit stats updates
        io.to(`user:${currentUid}`).emit('profile:stats:update', {
          userId: currentUid,
          followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
        });
        
        io.to(`user:${targetUid}`).emit('profile:stats:update', {
          userId: targetUid,
          followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
        });
      }
    } catch (error) {
      console.error('WebSocket emission error:', error);
    }
    
    res.json({
      success: true,
      following: true,
      followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0,
      followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
    });
    
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
};

// Unfollow user via HTTP
const unfollowUser = async (req, res) => {
  try {
    const { targetUid } = req.params;
    const currentUid = req.user.uid;
    
    console.log(`👥 HTTP Unfollow: ${currentUid} unfollowing ${targetUid}`);
    
    if (currentUid === targetUid) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }
    
    // Get both users
    const [currentUser, targetUser] = await Promise.all([
      users().findOne({ uid: currentUid }),
      users().findOne({ uid: targetUid })
    ]);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    // Check if not following
    if (!currentUser.following?.includes(targetUid)) {
      return res.status(400).json({ 
        error: 'Not following this user',
        following: false,
        followersCount: targetUser.followersCount || targetUser.followers?.length || 0,
        followingCount: currentUser.followingCount || currentUser.following?.length || 0
      });
    }
    
    // Update both users
    await users().updateOne(
      { uid: currentUid },
      { 
        $pull: { following: targetUid },
        $set: { followingCount: Math.max(0, (currentUser.following?.length || 1) - 1) }
      }
    );
    
    await users().updateOne(
      { uid: targetUid },
      { 
        $pull: { followers: currentUid },
        $set: { followersCount: Math.max(0, (targetUser.followers?.length || 1) - 1) }
      }
    );
    
    // Get updated counts
    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      users().findOne({ uid: currentUid }),
      users().findOne({ uid: targetUid })
    ]);
    
    // Emit WebSocket events if available
    try {
      const wsService = require('../services/websocket.service');
      const io = wsService.getIO();
      
      if (io) {
        // Emit to the unfollower
        io.to(`user:${currentUid}`).emit('user:unfollow:ack', {
          userId: currentUid,
          targetUserId: targetUid,
          following: false
        });
        
        // Emit to the target user
        io.to(`user:${targetUid}`).emit('profile:follower:removed', {
          userId: currentUid,
          targetUserId: targetUid
        });
        
        // Emit stats updates
        io.to(`user:${currentUid}`).emit('profile:stats:update', {
          userId: currentUid,
          followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
        });
        
        io.to(`user:${targetUid}`).emit('profile:stats:update', {
          userId: targetUid,
          followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0
        });
      }
    } catch (error) {
      console.error('WebSocket emission error:', error);
    }
    
    res.json({
      success: true,
      following: false,
      followersCount: updatedTargetUser.followersCount || updatedTargetUser.followers?.length || 0,
      followingCount: updatedCurrentUser.followingCount || updatedCurrentUser.following?.length || 0
    });
    
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
};

module.exports = {
  getFollowers,
  getFollowing,
  checkFollowStatus,
  followUser,
  unfollowUser
};
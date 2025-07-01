// analytics.controller.js
const { reels, users } = require('../utils/db');
const { ObjectId } = require('mongodb');

// Get overall account analytics
exports.getAccountAnalytics = async (req, res) => {
  try {
    const { uid } = req.user;
    const { period = '1month' } = req.query; // Options: '1week', '1month', '3months', '1year'
    
    // Get date threshold based on period
    const dateThreshold = new Date();
    switch(period) {
      case '1week':
        dateThreshold.setDate(dateThreshold.getDate() - 7);
        break;
      case '3months':
        dateThreshold.setMonth(dateThreshold.getMonth() - 3);
        break;
      case '1year':
        dateThreshold.setFullYear(dateThreshold.getFullYear() - 1);
        break;
      case '1month':
      default:
        dateThreshold.setMonth(dateThreshold.getMonth() - 1);
    }

    // Get user details
    const user = await users().findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count followers and following
    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    // Get all reels for this user
    const userReels = await reels()
      .find({ uid })
      .toArray();

    // Filter reels by period (if you want to only count views from reels created in this period)
    // Otherwise, remove this filter to count all-time views
    const reelsInPeriod = userReels.filter(reel => {
      const reelDate = new Date(reel.createdAt);
      return reelDate >= dateThreshold;
    });

    // Calculate total views directly from reels
    const totalViews = userReels.reduce((sum, reel) => {
      // Handle both direct number and MongoDB $numberInt format
      const views = typeof reel.views === 'object' && reel.views.$numberInt 
        ? parseInt(reel.views.$numberInt) 
        : (reel.views || 0);
      return sum + views;
    }, 0);

    // Calculate total views for period (if you want period-specific views)
    const periodViews = reelsInPeriod.reduce((sum, reel) => {
      return sum + (reel.views || 0);
    }, 0);

    // Calculate estimated revenue ($0.002 per view to match frontend)
    const estimatedRevenue = totalViews * 0.002;

    // Get latest reels with their view data
    const latestFlicks = userReels
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10) // Get top 10 latest reels to match frontend
      .map(reel => ({
        _id: reel._id.toString(),
        title: reel.title || 'Untitled',
        thumbnailUrl: reel.thumbnailUrl || reel.streamData?.thumbnailUrl || '',
        views: typeof reel.views === 'object' && reel.views.$numberInt 
          ? parseInt(reel.views.$numberInt) 
          : (reel.views || 0),
        publishedDate: reel.createdAt || new Date().toISOString()
      }));

    return res.status(200).json({
      totalFlicks: userReels.length,
      totalViews, // All-time views
      periodViews, // Views for selected period (optional)
      followersCount,
      followingCount, 
      estimatedRevenue,
      latestFlicks,
      period
    });

  } catch (err) {
    console.error('❌ Error getting analytics:', err);
    return res.status(500).json({ error: 'Failed to get analytics' });
  }
};

// Get analytics for a specific flick
exports.getFlickAnalytics = async (req, res) => {
  try {
    const { flickId } = req.params;
    const { uid } = req.user;

    // Validate flickId
    if (!ObjectId.isValid(flickId)) {
      return res.status(400).json({ error: 'Invalid flick ID' });
    }

    // Get the reel
    const reel = await reels().findOne({ 
      _id: new ObjectId(flickId),
      uid // Ensure user owns this reel
    });

    if (!reel) {
      return res.status(404).json({ error: 'Flick not found' });
    }

    // Return analytics data
    return res.status(200).json({
      _id: reel._id.toString(),
      title: reel.title || 'Untitled',
      thumbnailUrl: reel.thumbnailUrl || reel.streamData?.thumbnailUrl || '',
      views: reel.views || 0,
      likes: reel.likes || 0,
      comments: reel.comments?.length || 0,
      shares: reel.shares || 0,
      publishedDate: reel.createdAt || new Date().toISOString(),
      duration: reel.duration || 0,
      description: reel.description || ''
    });

  } catch (err) {
    console.error('❌ Error getting flick analytics:', err);
    return res.status(500).json({ error: 'Failed to get flick analytics' });
  }
};

// Get trending analytics
exports.getTrendingAnalytics = async (req, res) => {
  try {
    const { period = '1week' } = req.query;
    
    // Get date threshold
    const dateThreshold = new Date();
    switch(period) {
      case '1day':
        dateThreshold.setDate(dateThreshold.getDate() - 1);
        break;
      case '1week':
        dateThreshold.setDate(dateThreshold.getDate() - 7);
        break;
      case '1month':
        dateThreshold.setMonth(dateThreshold.getMonth() - 1);
        break;
      default:
        dateThreshold.setDate(dateThreshold.getDate() - 7);
    }

    // Get trending reels based on views and recency
    const trendingReels = await reels()
      .find({
        createdAt: { $gte: dateThreshold.toISOString() }
      })
      .sort({ views: -1, createdAt: -1 })
      .limit(20)
      .toArray();

    // Format response
    const trendingData = trendingReels.map(reel => ({
      _id: reel._id.toString(),
      title: reel.title || 'Untitled',
      thumbnailUrl: reel.thumbnailUrl || reel.streamData?.thumbnailUrl || '',
      views: reel.views || 0,
      likes: reel.likes || 0,
      creator: {
        uid: reel.uid,
        username: reel.username || 'Anonymous',
        profileImage: reel.userProfileImage || ''
      },
      publishedDate: reel.createdAt || new Date().toISOString()
    }));

    return res.status(200).json({
      trending: trendingData,
      period,
      totalResults: trendingData.length
    });

  } catch (err) {
    console.error('❌ Error getting trending analytics:', err);
    return res.status(500).json({ error: 'Failed to get trending analytics' });
  }
};
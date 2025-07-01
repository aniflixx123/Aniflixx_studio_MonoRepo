const { viewers } = require('../utils/db');
const { ObjectId } = require('mongodb');
const NodeCache = require('node-cache');


const batchUpdateQueue = new Map(); // reelId -> Set of userIds
const BATCH_INTERVAL = 5000; // 5 seconds

// Process batch updates
setInterval(async () => {
  if (batchUpdateQueue.size === 0) return;
  
  try {
    const updates = [];
    
    for (const [reelId, userIds] of batchUpdateQueue.entries()) {
      for (const uid of userIds) {
        updates.push({
          updateOne: {
            filter: { reelId, uid, isAnalyticView: true },
            update: { 
              $set: { 
                lastActivity: new Date(),
                isActive: true 
              },
              $setOnInsert: {
                timestamp: new Date(),
                viewDuration: 0,
                completed: false,
                platform: 'unknown'
              }
            },
            upsert: true
          }
        });
      }
    }
    
    if (updates.length > 0) {
      await viewers().bulkWrite(updates);
      console.log(`✅ Batch updated ${updates.length} viewer records`);
    }
    
    // Clear the queue
    batchUpdateQueue.clear();
    
  } catch (error) {
    console.error('❌ Batch update error:', error);
  }
}, BATCH_INTERVAL);

// Update the trackView method to use batching:
exports.trackView = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;
    const { platform = 'unknown' } = req.body;
    
    // Add to batch queue
    if (!batchUpdateQueue.has(reelId)) {
      batchUpdateQueue.set(reelId, new Set());
    }
    batchUpdateQueue.get(reelId).add(uid);
    
    // Invalidate cache
    viewerCountCache.del(reelId.toString());
    
    // Return immediately
    res.status(200).json({ success: true, queued: true });
    
  } catch (err) {
    console.error('❌ Error tracking view:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cache for viewer counts with 10 second TTL
const viewerCountCache = new NodeCache({ stdTTL: 10 });

// Queue for batching heartbeat updates
let heartbeatQueue = [];
const BATCH_SIZE = 50;
const HEARTBEAT_INTERVAL_MS = 5000; // Process heartbeats every 5 seconds

// Process heartbeats in batches
setInterval(async () => {
  if (heartbeatQueue.length === 0) return;
  
  try {
    const batch = heartbeatQueue.splice(0, BATCH_SIZE);
    
    // Group by reelId and uid to avoid duplicate operations
    const uniqueUpdates = {};
    batch.forEach(item => {
      const key = `${item.reelId}:${item.uid}`;
      uniqueUpdates[key] = item;
    });
    
    const bulkOps = Object.values(uniqueUpdates).map(item => ({
      updateOne: {
        filter: { reelId: item.reelId, uid: item.uid },
        update: { $set: { timestamp: new Date(), active: true } },
        upsert: true
      }
    }));
    
    if (bulkOps.length > 0) {
      await viewers().bulkWrite(bulkOps);
      console.log(`✅ Processed ${bulkOps.length} viewer heartbeats in batch`);
    }
  } catch (err) {
    console.error('❌ Batch heartbeat update error:', err);
  }
}, HEARTBEAT_INTERVAL_MS);

// Register a viewer for a reel
exports.registerViewer = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;

    // Add to queue for batch processing
    heartbeatQueue.push({ 
      reelId: reelId.toString(), 
      uid,
      action: 'register' 
    });

    // Invalidate cache for this reel
    viewerCountCache.del(reelId.toString());

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error registering viewer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update viewer heartbeat to maintain active status
exports.updateHeartbeat = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;

    // Add to queue instead of immediate update
    heartbeatQueue.push({ 
      reelId: reelId.toString(), 
      uid,
      action: 'heartbeat'
    });
    
    // Return immediately without waiting for DB operation
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error updating viewer heartbeat:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove viewer when they stop watching
exports.deregisterViewer = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;

    // This operation should happen immediately, not batched
    await viewers().deleteOne({ 
      reelId: reelId.toString(), 
      uid 
    });

    // Invalidate cache for this reel
    viewerCountCache.del(reelId.toString());

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error deregistering viewer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current viewer count for a reel
exports.getViewerCount = async (req, res) => {
  try {
    const { reelId } = req.params;
    const reelIdStr = reelId.toString();
    
    // Try to get from cache first
    const cachedCount = viewerCountCache.get(reelIdStr);
    if (cachedCount !== undefined) {
      return res.status(200).json({ count: cachedCount });
    }
    
    // Consider viewers active only if they've sent a heartbeat in the last 45 seconds
    const activeTimeThreshold = new Date();
    activeTimeThreshold.setSeconds(activeTimeThreshold.getSeconds() - 45);

    const count = await viewers().countDocuments({
      reelId: reelIdStr,
      timestamp: { $gte: activeTimeThreshold }
    });

    // Store in cache
    viewerCountCache.set(reelIdStr, count);

    res.status(200).json({ count });
  } catch (err) {
    console.error('❌ Error getting viewer count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all active reels with their viewer counts (for admin or analytics)
exports.getAllViewerCounts = async (req, res) => {
  try {
    const activeTimeThreshold = new Date();
    activeTimeThreshold.setSeconds(activeTimeThreshold.getSeconds() - 45);

    // Use aggregation with time limit
    const activeReels = await viewers().aggregate([
      {
        $match: {
          timestamp: { $gte: activeTimeThreshold }
        }
      },
      {
        $group: {
          _id: "$reelId",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 50 // Limit to top 50 active reels
      }
    ]).toArray();

    res.status(200).json({ activeReels });
  } catch (err) {
    console.error('❌ Error getting all viewer counts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// NEW FUNCTIONS FOR ANALYTICS SUPPORT

// Track a new view (for analytics purposes - more permanent than real-time viewers)
exports.trackView = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;
    
    // Check if this view is already counted (prevent duplicates within a time window)
    const recentView = await viewers().findOne({
      reelId: reelId.toString(),
      uid,
      timestamp: { 
        $gte: new Date(Date.now() - 3600000) // Last hour
      },
      isAnalyticView: true // Special flag to distinguish from real-time viewers
    });
    
    if (recentView) {
      // Already counted this view in the last hour
      return res.status(200).json({ success: true, counted: false });
    }
    
    // Record the view for analytics
    await viewers().insertOne({
      reelId: reelId.toString(),
      uid,
      timestamp: new Date(),
      viewDuration: 0, // Will be updated as user watches
      completed: false,
      isAnalyticView: true,
      userAgent: req.headers['user-agent'] || 'unknown',
      platform: req.body.platform || 'unknown', // App can send 'ios', 'android', 'web', etc.
    });
    
    // Invalidate cache
    viewerCountCache.del(reelId.toString());
    
    res.status(200).json({ success: true, counted: true });
  } catch (err) {
    console.error('❌ Error tracking view for analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update view duration (called periodically as user watches)
exports.updateViewDuration = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { uid } = req.user;
    const { duration, completed } = req.body;
    
    if (typeof duration !== 'number' || duration < 0) {
      return res.status(400).json({ error: 'Invalid duration value' });
    }
    
    // Find the most recent view for this user/reel
    const recentView = await viewers().findOne(
      {
        reelId: reelId.toString(),
        uid,
        isAnalyticView: true
      }, 
      {
        sort: { timestamp: -1 }
      }
    );
    
    if (!recentView) {
      return res.status(404).json({ error: 'View not found' });
    }
    
    // Update the duration
    await viewers().updateOne(
      { _id: recentView._id },
      { 
        $set: { 
          viewDuration: duration,
          completed: completed || false,
          lastUpdated: new Date()
        } 
      }
    );
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Error updating view duration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get total view count for a reel (for analytics, not real-time viewers)
exports.getTotalViewCount = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { period } = req.query; // optional: '1day', '1week', '1month', 'all'
    
    let dateFilter = {};
    const now = new Date();
    
    if (period) {
      let startDate = new Date();
      switch(period) {
        case '1day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '1week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'all':
        default:
          // No date filter
          break;
      }
      
      if (period !== 'all') {
        dateFilter = { timestamp: { $gte: startDate } };
      }
    }
    
    // Get unique viewers count - note we're looking for isAnalyticView: true
    const uniqueViewersCount = await viewers().distinct('uid', { 
      reelId: reelId.toString(),
      isAnalyticView: true,
      ...dateFilter
    }).then(results => results.length);
    
    // Get total views count (not distinct by user)
    const totalViewsCount = await viewers().countDocuments({
      reelId: reelId.toString(),
      isAnalyticView: true,
      ...dateFilter
    });
    
    // Get average view duration
    const durationResult = await viewers().aggregate([
      {
        $match: {
          reelId: reelId.toString(),
          isAnalyticView: true,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$viewDuration' },
          maxDuration: { $max: '$viewDuration' },
          completionRate: {
            $avg: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
          }
        }
      }
    ]).toArray();
    
    const stats = durationResult.length > 0 ? durationResult[0] : {
      avgDuration: 0,
      maxDuration: 0,
      completionRate: 0
    };
    
    res.status(200).json({
      reelId,
      period: period || 'all',
      uniqueViewers: uniqueViewersCount,
      totalViews: totalViewsCount,
      avgDuration: Math.round(stats.avgDuration || 0),
      maxDuration: stats.maxDuration || 0,
      completionRate: (stats.completionRate || 0) * 100 // Convert to percentage
    });
  } catch (err) {
    console.error('❌ Error getting total view count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get view breakdown by time period (for charts)
exports.getViewsBreakdown = async (req, res) => {
  try {
    const { reelId } = req.params;
    const { granularity = 'day' } = req.query; // 'hour', 'day', 'week', 'month'
    
    let dateFormat;
    let startDate = new Date();
    let groupBy;
    
    switch(granularity) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00';
        startDate.setHours(startDate.getHours() - 24); // Last 24 hours
        groupBy = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'week':
        dateFormat = '%Y-W%U'; // Year-Week format
        startDate.setDate(startDate.getDate() - 90); // Last 90 days (~ 12 weeks)
        groupBy = {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
        break;
      case 'month':
        dateFormat = '%Y-%m'; // Year-Month format
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        groupBy = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        };
        break;
      case 'day':
      default:
        dateFormat = '%Y-%m-%d'; // Year-Month-Day format
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        groupBy = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
        break;
    }
    
    const viewsBreakdown = await viewers().aggregate([
      {
        $match: {
          reelId: reelId.toString(),
          isAnalyticView: true,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$uid' }
        }
      },
      {
        $project: {
          _id: 0,
          date: { 
            $dateToString: { 
              format: dateFormat, 
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: { $ifNull: ['$_id.month', 1] },
                  day: { $ifNull: ['$_id.day', 1] },
                  hour: { $ifNull: ['$_id.hour', 0] }
                }
              }
            }
          },
          views: '$count',
          uniqueViewers: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]).toArray();
    
    res.status(200).json({
      reelId,
      granularity,
      data: viewsBreakdown
    });
  } catch (err) {
    console.error('❌ Error getting views breakdown:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export public method for getting view count directly (used by reels.controller)
exports.getReelViewCountDirect = async (reelId) => {
  try {
    // First check cache
    const cachedCount = viewerCountCache.get(reelId);
    if (cachedCount !== undefined) {
      return cachedCount;
    }
    
    // If not in cache, query for analytics view count
    const count = await viewers().countDocuments({
      reelId,
      isAnalyticView: true
    });
    
    // Store in cache
    viewerCountCache.set(reelId, count);
    
    return count;
  } catch (err) {
    console.error('❌ Error getting direct view count:', err);
    return 0;
  }
};
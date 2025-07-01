// services/analytics.service.js
const { engagements, analytics } = require('../utils/db');
const { ObjectId } = require('mongodb');

class AnalyticsService {
  constructor() {
    this.eventQueue = [];
    this.flushInterval = null;
    this.startBatchProcessor();
  }

  // Track any event
  async trackEvent(eventData) {
    const event = {
      _id: new ObjectId(),
      ...eventData,
      timestamp: new Date(),
      sessionId: eventData.sessionId || null,
      deviceId: eventData.deviceId || null,
      ip: eventData.ip || null,
      userAgent: eventData.userAgent || null
    };

    // Add to queue for batch processing
    this.eventQueue.push(event);

    // Also emit to WebSocket for real-time dashboard
    if (global.websocketService) {
      global.websocketService.emitToUser('admin', 'analytics:event', event);
    }

    return event._id;
  }

  // Track video engagement
  async trackVideoEngagement(data) {
    return this.trackEvent({
      type: 'video_engagement',
      category: 'engagement',
      action: data.action, // play, pause, complete, skip, etc.
      uid: data.uid,
      reelId: data.reelId,
      data: {
        watchTime: data.watchTime,
        duration: data.duration,
        percentWatched: data.percentWatched,
        dropOffPoint: data.dropOffPoint,
        isReplay: data.isReplay,
        quality: data.quality,
        volume: data.volume,
        isFullscreen: data.isFullscreen
      }
    });
  }

  // Track user interaction
  async trackInteraction(data) {
    return this.trackEvent({
      type: 'user_interaction',
      category: 'interaction',
      action: data.action, // like, comment, share, follow, etc.
      uid: data.uid,
      targetId: data.targetId,
      targetType: data.targetType, // reel, user, comment, etc.
      data: data.metadata || {}
    });
  }

  // Track screen view
  async trackScreenView(data) {
    return this.trackEvent({
      type: 'screen_view',
      category: 'navigation',
      screen: data.screen,
      uid: data.uid,
      data: {
        previousScreen: data.previousScreen,
        duration: data.duration,
        scrollDepth: data.scrollDepth
      }
    });
  }

  // Track session
  async trackSession(data) {
    return this.trackEvent({
      type: 'session',
      category: 'app_usage',
      action: data.action, // start, end, background, foreground
      uid: data.uid,
      sessionId: data.sessionId,
      data: {
        duration: data.duration,
        screensViewed: data.screensViewed,
        videosWatched: data.videosWatched,
        interactions: data.interactions,
        appVersion: data.appVersion,
        device: data.device
      }
    });
  }

  // Track search
  async trackSearch(data) {
    return this.trackEvent({
      type: 'search',
      category: 'discovery',
      query: data.query,
      uid: data.uid,
      data: {
        resultsCount: data.resultsCount,
        clickedResult: data.clickedResult,
        clickedPosition: data.clickedPosition,
        filters: data.filters
      }
    });
  }

  // Track errors
  async trackError(data) {
    return this.trackEvent({
      type: 'error',
      category: 'system',
      error: data.error,
      uid: data.uid,
      data: {
        stack: data.stack,
        component: data.component,
        action: data.action,
        metadata: data.metadata
      }
    });
  }

  // Batch processor
  startBatchProcessor() {
    this.flushInterval = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        const events = [...this.eventQueue];
        this.eventQueue = [];

        try {
          await analytics().insertMany(events);
          console.log(`✅ Flushed ${events.length} analytics events`);
        } catch (error) {
          console.error('❌ Failed to flush analytics:', error);
          // Re-queue failed events
          this.eventQueue.unshift(...events);
        }
      }
    }, 5000); // Flush every 5 seconds
  }

  // Get analytics for a reel
  async getReelAnalytics(reelId, timeRange = '24h') {
    const startTime = this.getStartTime(timeRange);
    
    const [
      views,
      engagement,
      retention,
      demographics
    ] = await Promise.all([
      this.getReelViews(reelId, startTime),
      this.getReelEngagement(reelId, startTime),
      this.getReelRetention(reelId, startTime),
      this.getReelDemographics(reelId, startTime)
    ]);

    return {
      reelId,
      timeRange,
      views,
      engagement,
      retention,
      demographics
    };
  }

  async getReelViews(reelId, startTime) {
    const views = await analytics().aggregate([
      {
        $match: {
          type: 'video_engagement',
          'data.action': 'play',
          reelId: new ObjectId(reelId),
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d-%H',
              date: '$timestamp'
            }
          },
          count: { $sum: 1 },
          uniqueViewers: { $addToSet: '$uid' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    return {
      total: views.reduce((sum, v) => sum + v.count, 0),
      unique: new Set(views.flatMap(v => v.uniqueViewers)).size,
      hourly: views.map(v => ({
        hour: v._id,
        views: v.count,
        unique: v.uniqueViewers.length
      }))
    };
  }

  async getReelEngagement(reelId, startTime) {
    const engagement = await analytics().aggregate([
      {
        $match: {
          type: 'user_interaction',
          targetId: reelId,
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    return engagement.reduce((acc, e) => {
      acc[e._id] = e.count;
      return acc;
    }, {});
  }

  async getReelRetention(reelId, startTime) {
    const retention = await analytics().aggregate([
      {
        $match: {
          type: 'video_engagement',
          reelId: new ObjectId(reelId),
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$uid',
          avgWatchTime: { $avg: '$data.watchTime' },
          avgPercentWatched: { $avg: '$data.percentWatched' },
          replays: {
            $sum: { $cond: ['$data.isReplay', 1, 0] }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgWatchTime: { $avg: '$avgWatchTime' },
          avgCompletion: { $avg: '$avgPercentWatched' },
          totalReplays: { $sum: '$replays' }
        }
      }
    ]).toArray();

    return retention[0] || {
      avgWatchTime: 0,
      avgCompletion: 0,
      totalReplays: 0
    };
  }

  async getReelDemographics(reelId, startTime) {
    // This would join with users collection to get demographics
    // Simplified version here
    return {
      countries: {},
      devices: {},
      ages: {}
    };
  }

  getStartTime(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now - 60 * 60 * 1000);
      case '24h': return new Date(now - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 24 * 60 * 60 * 1000);
    }
  }

  shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

module.exports = new AnalyticsService();
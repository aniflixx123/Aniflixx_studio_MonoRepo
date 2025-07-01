// hooks/useReelViewTracking.ts
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

interface ViewTrackingOptions {
  onViewCountUpdate?: (reelId: string, count: number) => void;
  trackAnalytics?: boolean;
  heartbeatInterval?: number;
}

export const useReelViewTracking = (options: ViewTrackingOptions = {}) => {
  const { 
    onViewCountUpdate,
    trackAnalytics = true,
    heartbeatInterval = 30000 
  } = options;
  
  const { socket, connected } = useAppStore();
  const currentReelRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewStartTimeRef = useRef<number>(0);
  const hasTrackedViewRef = useRef<Set<string>>(new Set());

  // Track view for analytics (once per reel per session)
  const trackView = useCallback(async (reelId: string) => {
    if (!trackAnalytics || hasTrackedViewRef.current.has(reelId)) {
      return;
    }

    try {
      const user = auth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      const response = await fetch(`${API_BASE}/reels/${reelId}/analytics/track-view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: Platform.OS
        })
      });

      if (response.ok) {
        hasTrackedViewRef.current.add(reelId);
        console.log(`✅ View tracked for reel: ${reelId}`);
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, [trackAnalytics]);

  // Update view duration for analytics
  const updateViewDuration = useCallback(async (reelId: string, completed: boolean = false) => {
    if (!trackAnalytics || !viewStartTimeRef.current) return;

    try {
      const user = auth().currentUser;
      if (!user) return;

      const duration = Math.floor((Date.now() - viewStartTimeRef.current) / 1000);
      const token = await user.getIdToken();
      
      await fetch(`${API_BASE}/reels/${reelId}/analytics/update-duration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration,
          completed
        })
      });
    } catch (error) {
      console.error('Error updating view duration:', error);
    }
  }, [trackAnalytics]);

  // Register as active viewer (for real-time count)
  const registerViewer = useCallback(async (reelId: string) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // REST API call for initial registration
      await fetch(`${API_BASE}/reels/${reelId}/viewers/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // WebSocket for real-time updates
      if (socket && connected) {
        socket.emit('reel:join', { reelId });
      }

      // Start heartbeat
      heartbeatTimerRef.current = setInterval(async () => {
        await fetch(`${API_BASE}/reels/${reelId}/viewers/heartbeat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }, heartbeatInterval);

    } catch (error) {
      console.error('Error registering viewer:', error);
    }
  }, [socket, connected, heartbeatInterval]);

  // Deregister viewer
  const deregisterViewer = useCallback(async (reelId: string) => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      
      // Clear heartbeat
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      // Update duration before leaving
      await updateViewDuration(reelId, false);

      // REST API call
      await fetch(`${API_BASE}/reels/${reelId}/viewers/deregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // WebSocket notification
      if (socket && connected) {
        socket.emit('reel:leave', { reelId });
      }

    } catch (error) {
      console.error('Error deregistering viewer:', error);
    }
  }, [socket, connected, updateViewDuration]);

  // Main function to start tracking a reel
  const startTracking = useCallback(async (reelId: string) => {
    // Stop tracking previous reel
    if (currentReelRef.current && currentReelRef.current !== reelId) {
      await stopTracking();
    }

    currentReelRef.current = reelId;
    viewStartTimeRef.current = Date.now();

    // Track view for analytics
    await trackView(reelId);

    // Register as active viewer
    await registerViewer(reelId);

    console.log(`👁️ Started tracking reel: ${reelId}`);
  }, [trackView, registerViewer]);

  // Stop tracking current reel
  const stopTracking = useCallback(async () => {
    if (!currentReelRef.current) return;

    const reelId = currentReelRef.current;
    
    // Deregister viewer
    await deregisterViewer(reelId);

    currentReelRef.current = null;
    viewStartTimeRef.current = 0;

    console.log(`👁️ Stopped tracking reel: ${reelId}`);
  }, [deregisterViewer]);

  // Mark video as completed
  const markCompleted = useCallback(async () => {
    if (!currentReelRef.current) return;
    
    await updateViewDuration(currentReelRef.current, true);
  }, [updateViewDuration]);

  // Listen for viewer count updates via WebSocket
  useEffect(() => {
    if (!socket || !connected || !onViewCountUpdate) return;

    const handleViewerUpdate = (data: any) => {
      onViewCountUpdate(data.reelId, data.count);
    };

    socket.on('viewers:update', handleViewerUpdate);

    return () => {
      socket.off('viewers:update', handleViewerUpdate);
    };
  }, [socket, connected, onViewCountUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentReelRef.current) {
        stopTracking();
      }
    };
  }, []);

  return {
    startTracking,
    stopTracking,
    markCompleted,
    currentReelId: currentReelRef.current
  };
};
// hooks/useNotificationBadge.ts
import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { useAppStore } from '../store/appStore';

const API_BASE = 'https://aniflixx-backend.onrender.com/api';

export const useNotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  // Use the store hooks properly
  const socket = useAppStore((state) => state.socket);
  const connected = useAppStore((state) => state.connected);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Listen for new notifications via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, connected]);

  const clearBadge = () => {
    setUnreadCount(0);
  };

  return { unreadCount, clearBadge, refreshCount: fetchUnreadCount };
};
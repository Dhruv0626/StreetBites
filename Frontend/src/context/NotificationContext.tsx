import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService, type AppNotification } from '../services/notificationService';
import { triggerNotificationSoundAndVoice } from '../utils/notificationAudio';
import { NotificationDropBanner, type DropNotificationData } from '../components/common/NotificationDropBanner';

interface NotificationContextType {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  triggerDrop: (data: DropNotificationData, playSound?: boolean) => void;
  isVoiceMuted: boolean;
  toggleVoiceMute: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeDrop, setActiveDrop] = useState<DropNotificationData | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(() => {
    return localStorage.getItem('sb_notif_voice_muted') === 'true';
  });

  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  const toggleVoiceMute = useCallback(() => {
    setIsVoiceMuted((prev) => {
      const next = !prev;
      localStorage.setItem('sb_notif_voice_muted', String(next));
      return next;
    });
    return !isVoiceMuted;
  }, [isVoiceMuted]);

  const triggerDrop = useCallback((data: DropNotificationData, playSound: boolean = true) => {
    setActiveDrop(data);

    if (playSound && !isVoiceMuted) {
      const tone =
        data.type === 'DELIVERY'
          ? 'delivery'
          : data.type === 'PAYOUT'
            ? 'payout'
            : 'order';

      triggerNotificationSoundAndVoice(
        data.title,
        data.message,
        data.role || user?.role || 'CUSTOMER',
        tone
      );
    }
  }, [isVoiceMuted, user?.role]);

  // Periodic Poller to catch any backend notification drop instantly
  const pollNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const res = await notificationService.getNotifications();
      if (res?.success && Array.isArray(res.data)) {
        const notifications: AppNotification[] = res.data;
        const unread = notifications.filter((n) => !n.is_read);
        setUnreadCount(unread.length);

        if (isFirstLoadRef.current) {
          // On initial page load, record all existing IDs so we don't trigger historic sounds
          notifications.forEach((n) => knownIdsRef.current.add(n._id || n.id || ''));
          isFirstLoadRef.current = false;
          return;
        }

        // Find newly dropped unread notifications
        const newlyDropped = unread.filter((n) => {
          const id = n._id || n.id || '';
          return id && !knownIdsRef.current.has(id);
        });

        if (newlyDropped.length > 0) {
          // Register all as known
          newlyDropped.forEach((n) => knownIdsRef.current.add(n._id || n.id || ''));

          // Drop the most recent new notification instantly
          const latest = newlyDropped[0];
          triggerDrop(
            {
              id: latest._id || latest.id,
              title: latest.title,
              message: latest.message,
              type: latest.type,
              role: user.role,
              orderId: latest.order_id,
            },
            true
          );
        }
      }
    } catch {
      // Quiet background polling failure tolerance
    }
  }, [user, triggerDrop]);

  useEffect(() => {
    if (!user) {
      isFirstLoadRef.current = true;
      knownIdsRef.current.clear();
      setUnreadCount(0);
      return;
    }

    // Initial check
    pollNotifications();

    // Poll every 5 seconds for instant notification drops
    const interval = setInterval(pollNotifications, 5000);

    return () => clearInterval(interval);
  }, [user, pollNotifications]);

  const handleCloseDrop = useCallback(() => {
    setActiveDrop(null);
  }, []);

  const handleActionDrop = useCallback((item: DropNotificationData) => {
    if (item.id) {
      notificationService.markSingleRead(item.id).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshNotifications: pollNotifications,
        triggerDrop,
        isVoiceMuted,
        toggleVoiceMute,
      }}
    >
      {children}
      {/* Global Instant Drop Notification Banner */}
      <NotificationDropBanner
        notification={activeDrop}
        onClose={handleCloseDrop}
        onAction={handleActionDrop}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;

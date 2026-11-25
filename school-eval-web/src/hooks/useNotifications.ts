import { useState, useEffect, useCallback } from 'react';
import { get, post, patch } from '../api/apiClient';

export interface AppNotificationItem {
  notificationId: number;
  recipientUserId: number;
  title: string;
  message: string;
  type: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface UseNotificationsResult {
  notifications: AppNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (isReadFilter?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<number>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(autoFetch: boolean = true): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const res = await get<{ unreadCount: number }>('/notifications/unread-count');
      const count = res?.data?.unreadCount ?? 0;
      setUnreadCount(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  const fetchNotifications = useCallback(async (isReadFilter?: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, boolean> = {};
      if (isReadFilter !== undefined) {
        params.is_read = isReadFilter;
      }
      const res = await get<AppNotificationItem[] | { data?: AppNotificationItem[] }>('/notifications', { params });
      const rawData = res.data;
      const items = Array.isArray(rawData) ? rawData : rawData?.data || [];
      setNotifications(items);

      // Re-sync unread count
      const unread = items.filter((n: AppNotificationItem) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'فشل في تحميل الإشعارات من الخادم.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number): Promise<void> => {
    try {
      await patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      await post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void Promise.resolve().then(() => {
        void fetchUnreadCount();
        void fetchNotifications();
      });
    }
  }, [autoFetch, fetchUnreadCount, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
}

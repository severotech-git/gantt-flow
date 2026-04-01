'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { INotification } from '@/types/index';

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  readNotifications: INotification[];
  readIsLoading: boolean;
  readHasMore: boolean;
  readCurrentPage: number;
}

interface NotificationActions {
  fetchNotifications: (page?: number) => Promise<void>;
  fetchReadNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addRealtime: (notifications: INotification | INotification[]) => void;
  dismissNotification: (id: string) => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  immer((set, get) => {
    async function fetchPage(read: boolean, page: number) {
      const loadingKey = read ? 'readIsLoading' : 'isLoading';
      if (get()[loadingKey]) return;
      set((s) => { s[loadingKey] = true; });
      try {
        const res = await fetch(`/api/notifications?page=${page}&read=${read}`);
        if (!res.ok) return;
        const data = await res.json();
        set((s) => {
          if (read) {
            if (page === 0) { s.readNotifications = data.notifications; }
            else { s.readNotifications.push(...data.notifications); }
            s.readHasMore = data.hasMore;
            s.readCurrentPage = page;
          } else {
            if (page === 0) { s.notifications = data.notifications; }
            else { s.notifications.push(...data.notifications); }
            s.hasMore = data.hasMore;
            s.currentPage = page;
            s.unreadCount = data.total;
          }
        });
      } catch (err) {
        console.error(`[fetchNotifications read=${read}]`, err);
      } finally {
        set((s) => { s[loadingKey] = false; });
      }
    }

    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      hasMore: true,
      currentPage: 0,
      readNotifications: [],
      readIsLoading: false,
      readHasMore: true,
      readCurrentPage: 0,

      fetchNotifications: (page = 0) => fetchPage(false, page),

      fetchReadNotifications: (page = 0) => fetchPage(true, page),

      fetchUnreadCount: async () => {
        try {
          const res = await fetch('/api/notifications/unread-count');
          if (!res.ok) return;
          const data = await res.json();
          set((s) => { s.unreadCount = data.count; });
        } catch (err) {
          console.error('[fetchUnreadCount]', err);
        }
      },

      markAsRead: async (id: string) => {
        try {
          const res = await fetch(`/api/notifications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true }),
          });
          if (!res.ok) return;
          set((s) => {
            const idx = s.notifications.findIndex((n) => n._id === id);
            if (idx !== -1) {
              const [notif] = s.notifications.splice(idx, 1);
              notif.read = true;
              s.readNotifications.unshift(notif);
              s.unreadCount = Math.max(0, s.unreadCount - 1);
            }
          });
        } catch (err) {
          console.error('[markAsRead]', err);
        }
      },

      markAllAsRead: async () => {
        try {
          const res = await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAllRead: true }),
          });
          if (!res.ok) return;
          set((s) => {
            const nowRead = s.notifications.map((n) => ({ ...n, read: true }));
            s.readNotifications.unshift(...nowRead);
            s.notifications = [];
            s.unreadCount = 0;
          });
        } catch (err) {
          console.error('[markAllAsRead]', err);
        }
      },

      addRealtime: (notificationsOrOne: INotification | INotification[]) => {
        set((s) => {
          const items = Array.isArray(notificationsOrOne) ? notificationsOrOne : [notificationsOrOne];
          for (const item of items) s.notifications.unshift(item);
          s.unreadCount += items.length;
        });
      },

      dismissNotification: async (id: string) => {
        try {
          const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
          if (!res.ok) return;
          set((s) => {
            const idx = s.notifications.findIndex((n) => n._id === id);
            if (idx !== -1) {
              s.notifications.splice(idx, 1);
              s.unreadCount = Math.max(0, s.unreadCount - 1);
            }
            const readIdx = s.readNotifications.findIndex((n) => n._id === id);
            if (readIdx !== -1) s.readNotifications.splice(readIdx, 1);
          });
        } catch (err) {
          console.error('[dismissNotification]', err);
        }
      },

      reset: () => {
        set((s) => {
          s.notifications = [];
          s.unreadCount = 0;
          s.isLoading = false;
          s.hasMore = true;
          s.currentPage = 0;
          s.readNotifications = [];
          s.readIsLoading = false;
          s.readHasMore = true;
          s.readCurrentPage = 0;
        });
      },
    };
  })
);

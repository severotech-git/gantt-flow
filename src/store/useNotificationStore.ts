'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { INotification } from '@/types/index';

const PAGE_SIZE = 20;

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
}

interface NotificationActions {
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addRealtime: (notification: INotification) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  immer((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    currentPage: 0,

    fetchNotifications: async (page = 0) => {
      set((s) => { s.isLoading = true; });
      try {
        const res = await fetch(`/api/notifications?page=${page}&read=false`);
        if (!res.ok) return;
        const data = await res.json();
        set((s) => {
          if (page === 0) {
            s.notifications = data.notifications;
          } else {
            s.notifications.push(...data.notifications);
          }
          s.hasMore = data.hasMore;
          s.currentPage = page;
        });
      } catch (err) {
        console.error('[fetchNotifications]', err);
      } finally {
        set((s) => { s.isLoading = false; });
      }
    },

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
          const notification = s.notifications.find((n) => n._id === id);
          if (notification) {
            notification.read = true;
          }
          if (s.unreadCount > 0) s.unreadCount--;
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
          for (const notification of s.notifications) {
            notification.read = true;
          }
          s.unreadCount = 0;
        });
      } catch (err) {
        console.error('[markAllAsRead]', err);
      }
    },

    addRealtime: (notification: INotification) => {
      set((s) => {
        // Add to the front of the list
        s.notifications.unshift(notification);
        // Keep only the latest PAGE_SIZE notifications in memory
        if (s.notifications.length > PAGE_SIZE * 3) {
          s.notifications = s.notifications.slice(0, PAGE_SIZE * 3);
        }
        if (!notification.read) {
          s.unreadCount++;
        }
      });
    },

    reset: () => {
      set((s) => {
        s.notifications = [];
        s.unreadCount = 0;
        s.isLoading = false;
        s.hasMore = true;
        s.currentPage = 0;
      });
    },
  }))
);

'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import { getSocket } from '@/lib/socket';
import type { INotification } from '@/types/index';

export function useNotifications() {
  useEffect(() => {
    // Fetch initial unread count
    useNotificationStore.getState().fetchUnreadCount().catch((err) => {
      console.error('[useNotifications] fetchUnreadCount error', err);
    });

    // Connect socket and subscribe to notification events
    const socket = getSocket();

    const handleNotification = (data: INotification) => {
      useNotificationStore.getState().addRealtime(data);
      // TODO: Show toast notification
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, []);
}

'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useProjectStore } from '@/store/useProjectStore';

/**
 * Manages the Socket.IO lifecycle for a project page.
 * Connects on mount, joins the project room, subscribes to events,
 * and cleans up on unmount.
 */
export function useSocket(projectId: string | null): void {
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const pid = projectId; // capture narrowed type for closures
    const socket = getSocket();
    const presence = usePresenceStore.getState();

    // ── Connection state ───────────────────────────────────────────────────

    function onConnect() {
      usePresenceStore.setState({ isConnected: true });
      // (Re)join room on connect/reconnect
      socket.emit('join-project', { projectId: pid });
      joinedRef.current = pid;
      usePresenceStore.setState({ currentProjectId: pid });
    }

    function onDisconnect() {
      usePresenceStore.setState({ isConnected: false });
    }

    // ── Presence events ────────────────────────────────────────────────────

    socket.on('presence-update', ({ users }) => {
      usePresenceStore.getState().setConnectedUsers(users);
    });

    socket.on('remote-cursor', ({ userId, ...cursor }) => {
      usePresenceStore.getState().updateRemoteCursor(userId, cursor);
    });

    socket.on('remote-cursor-hide', ({ userId }) => {
      usePresenceStore.getState().removeRemoteCursor(userId);
    });

    // ── Drag events ────────────────────────────────────────────────────────

    socket.on('drag-start', ({ userId, dragId, barData, pxPerDay }) => {
      usePresenceStore.getState().setRemoteDrag(userId, {
        userId,
        dragId,
        barData,
        deltaX: 0,
        remotePxPerDay: pxPerDay,
      });
    });

    socket.on('drag-move', ({ userId, deltaX }) => {
      usePresenceStore.getState().updateRemoteDragDelta(userId, deltaX);
    });

    socket.on('drag-end', ({ userId }) => {
      usePresenceStore.getState().clearRemoteDrag(userId);
    });

    // ── Remote actions (real-time change sync) ─────────────────────────────

    socket.on('remote-action', ({ action }) => {
      useProjectStore.getState()._applyRemoteAction(action);
    });

    // ── Connect ────────────────────────────────────────────────────────────

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected (e.g., hot reload), join immediately
    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    // ── Cleanup ────────────────────────────────────────────────────────────

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('presence-update');
      socket.off('remote-cursor');
      socket.off('remote-cursor-hide');
      socket.off('drag-start');
      socket.off('drag-move');
      socket.off('drag-end');
      socket.off('remote-action');

      if (joinedRef.current) {
        socket.emit('leave-project', { projectId: joinedRef.current });
        joinedRef.current = null;
      }

      presence.reset();
    };
  }, [projectId]);
}

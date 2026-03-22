'use client';

import { create } from 'zustand';
import type { PresenceUser, CursorData, RemoteDragData } from '@/lib/socketEvents';

interface PresenceState {
  // Connection
  isConnected: boolean;
  currentProjectId: string | null;

  // Users in the room
  connectedUsers: PresenceUser[];

  // Remote cursors: userId → cursor position
  remoteCursors: Map<string, CursorData & { lastSeen: number }>;

  // Remote drags: userId → drag state
  remoteDrags: Map<string, RemoteDragData>;
}

interface PresenceActions {
  // Connection state
  setConnected: (connected: boolean) => void;
  setCurrentProjectId: (projectId: string | null) => void;

  // Presence
  setConnectedUsers: (users: PresenceUser[]) => void;

  // Cursors
  updateRemoteCursor: (userId: string, cursor: CursorData) => void;
  removeRemoteCursor: (userId: string) => void;

  // Drags
  setRemoteDrag: (userId: string, data: RemoteDragData) => void;
  updateRemoteDragDelta: (userId: string, deltaX: number) => void;
  clearRemoteDrag: (userId: string) => void;

  // Cleanup
  reset: () => void;
}

const initialState: PresenceState = {
  isConnected: false,
  currentProjectId: null,
  connectedUsers: [],
  remoteCursors: new Map(),
  remoteDrags: new Map(),
};

export const usePresenceStore = create<PresenceState & PresenceActions>()((set) => ({
  ...initialState,

  setConnected: (isConnected) => set({ isConnected }),

  setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

  setConnectedUsers: (connectedUsers) => set({ connectedUsers }),

  updateRemoteCursor: (userId, cursor) =>
    set((state) => {
      const next = new Map(state.remoteCursors);
      next.set(userId, { ...cursor, lastSeen: performance.now() });
      return { remoteCursors: next };
    }),

  removeRemoteCursor: (userId) =>
    set((state) => {
      const next = new Map(state.remoteCursors);
      next.delete(userId);
      return { remoteCursors: next };
    }),

  setRemoteDrag: (userId, data) =>
    set((state) => {
      const next = new Map(state.remoteDrags);
      next.set(userId, data);
      return { remoteDrags: next };
    }),

  updateRemoteDragDelta: (userId, deltaX) =>
    set((state) => {
      const existing = state.remoteDrags.get(userId);
      if (!existing) return state;
      const next = new Map(state.remoteDrags);
      next.set(userId, { ...existing, deltaX });
      return { remoteDrags: next };
    }),

  clearRemoteDrag: (userId) =>
    set((state) => {
      const next = new Map(state.remoteDrags);
      next.delete(userId);
      return { remoteDrags: next };
    }),

  reset: () =>
    set({
      ...initialState,
      remoteCursors: new Map(),
      remoteDrags: new Map(),
    }),
}));

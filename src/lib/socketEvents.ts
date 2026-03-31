import type { ITask, IFeature, IEpic, IComment, INotification } from '@/types';

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

export interface CursorData {
  x: number;
  y: number;
  pxPerDay: number;
  scrollLeft: number;
  scrollTop: number;
}

// ─── Remote Drag ─────────────────────────────────────────────────────────────

export interface RemoteDragData {
  userId: string;
  dragId: string;
  barData: {
    plannedStart: string;
    plannedEnd: string;
    level: 'epic' | 'feature' | 'task';
  };
  deltaX: number;
  remotePxPerDay: number;
}

// ─── Project Actions (granular mutations) ────────────────────────────────────

export type ProjectAction =
  | { type: 'updateTask'; epicId: string; featureId: string; taskId: string; patch: Partial<ITask> }
  | { type: 'updateFeature'; epicId: string; featureId: string; patch: Partial<IFeature> }
  | { type: 'updateEpic'; epicId: string; patch: Partial<IEpic> }
  | { type: 'addTask'; epicId: string; featureId: string; task: ITask }
  | { type: 'addFeature'; epicId: string; feature: IFeature }
  | { type: 'addEpic'; epic: IEpic }
  | { type: 'removeTask'; epicId: string; featureId: string; taskId: string }
  | { type: 'removeFeature'; epicId: string; featureId: string }
  | { type: 'removeEpic'; epicId: string }
  | { type: 'updateDayCount'; epicId: string; featureId?: string; taskId?: string; dayCount: number }
  | { type: 'toggleEpicCollapse'; epicId: string; collapsed: boolean }
  | { type: 'toggleFeatureCollapse'; epicId: string; featureId: string; collapsed: boolean }
  | { type: 'setAllCollapsed'; collapsed: boolean }
  | { type: 'addComment'; epicId: string; featureId?: string; taskId?: string; comment: IComment };

// ─── Client → Server events ─────────────────────────────────────────────────

export interface ClientToServerEvents {
  'join-project': (data: { projectId: string }) => void;
  'leave-project': (data: { projectId: string }) => void;
  'cursor-move': (data: { projectId: string } & CursorData) => void;
  'cursor-hide': (data: { projectId: string }) => void;
  'remote-action': (data: { projectId: string; action: ProjectAction }) => void;
  'drag-start': (data: {
    projectId: string;
    dragId: string;
    barData: { plannedStart: string; plannedEnd: string; level: 'epic' | 'feature' | 'task' };
    pxPerDay: number;
  }) => void;
  'drag-move': (data: { projectId: string; dragId: string; deltaX: number }) => void;
  'drag-end': (data: { projectId: string; dragId: string }) => void;
}

// ─── Server → Client events ─────────────────────────────────────────────────

export interface ServerToClientEvents {
  'presence-update': (data: { users: PresenceUser[] }) => void;
  'remote-cursor': (data: { userId: string } & CursorData) => void;
  'remote-cursor-hide': (data: { userId: string }) => void;
  'remote-action': (data: { userId: string; action: ProjectAction }) => void;
  'drag-start': (data: {
    userId: string;
    dragId: string;
    barData: { plannedStart: string; plannedEnd: string; level: 'epic' | 'feature' | 'task' };
    pxPerDay: number;
  }) => void;
  'drag-move': (data: { userId: string; dragId: string; deltaX: number }) => void;
  'drag-end': (data: { userId: string; dragId: string }) => void;
  'notification': (data: INotification) => void;
}

// ─── Socket data attached after auth ─────────────────────────────────────────

export interface SocketData {
  userId: string;
  accountId: string;
  name: string;
  email: string;
}

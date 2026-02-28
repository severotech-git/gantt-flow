export type StatusType =
  | 'todo'
  | 'in-progress'
  | 'qa'
  | 'done'
  | 'canceled'
  | 'blocked';

export type TimelineScale = 'week' | 'month' | 'quarter';

export interface ITask {
  _id: string;
  name: string;
  status: StatusType;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  completionPct: number;
  plannedStart: string; // ISO date string
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  notes?: string;
  color?: string;
}

export interface IFeature {
  _id: string;
  name: string;
  status: StatusType;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  completionPct: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  tasks: ITask[];
  color?: string;
}

export interface IEpic {
  _id: string;
  name: string;
  status: StatusType;
  completionPct: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  features: IFeature[];
  color?: string;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  currentVersion: string;
  epics: IEpic[];
  createdAt: string;
  updatedAt: string;
}

export interface IProjectSnapshot {
  _id: string;
  projectId: string;
  versionName: string;
  snapshotData: IProject;
  createdAt: string;
}

export interface GanttItem {
  id: string;
  parentId?: string;
  level: 'epic' | 'feature' | 'task';
  name: string;
  status: StatusType;
  ownerId?: string;
  ownerName?: string;
  ownerAvatar?: string;
  completionPct: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  color?: string;
  isExpanded?: boolean;
  children?: GanttItem[];
  epicId?: string;
  featureId?: string;
}

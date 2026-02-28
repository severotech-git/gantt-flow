export type StatusType = string;

export type TimelineScale = 'week' | 'month' | 'quarter';

export interface IStatusConfig {
  value: string;
  label: string;
  color: string;
  isFinal?: boolean;
}

export interface IUserConfig {
  uid: string;
  name: string;
  color: string;
}

export interface IWorkspaceSettings {
  users: IUserConfig[];
  theme: 'dark' | 'light' | 'system';
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  allowWeekends: boolean;
}

export interface ITask {
  _id: string;
  name: string;
  status: StatusType;
  ownerId?: string;  // references IUserConfig.uid
  completionPct: number;
  plannedStart: string;
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
  ownerId?: string;  // references IUserConfig.uid
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
  ownerId?: string;  // references IUserConfig.uid
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
  archived?: boolean;
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

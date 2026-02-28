import mongoose, { Schema, Document, Model } from 'mongoose';
import { IStatusConfig, IUserConfig } from '@/types';

export const DEFAULT_STATUSES: IStatusConfig[] = [
  { value: 'todo',        label: 'To Do',       color: '#64748b', isFinal: false },
  { value: 'in-progress', label: 'In Progress', color: '#7c3aed', isFinal: false },
  { value: 'qa',          label: 'QA',          color: '#1d4ed8', isFinal: false },
  { value: 'done',        label: 'Done',        color: '#059669', isFinal: true  },
  { value: 'canceled',    label: 'Canceled',    color: '#475569', isFinal: true  },
  { value: 'blocked',     label: 'Blocked',     color: '#c2410c', isFinal: false },
];

export interface IWorkspaceSettingsDocument extends Document {
  users: IUserConfig[];
  theme: 'dark' | 'light';
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
}

const UserConfigSchema = new Schema(
  {
    uid:   { type: String, required: true },   // avoid Mongoose's built-in `id` virtual
    name:  { type: String, default: '' },
    color: { type: String, default: '#6366f1' },
  },
  { _id: false, id: false }
);

const StatusConfigSchema = new Schema(
  {
    value:   { type: String, required: true },
    label:   { type: String, required: true },
    color:   { type: String, required: true },
    isFinal: { type: Boolean, default: false },
  },
  { _id: false, id: false }
);

const WorkspaceSettingsSchema = new Schema<IWorkspaceSettingsDocument>(
  {
    users:  { type: [UserConfigSchema], default: [] },
    theme:  { type: String, enum: ['dark', 'light'], default: 'dark' },
    levelNames: {
      epic:    { type: String, default: 'Epic' },
      feature: { type: String, default: 'Feature' },
      task:    { type: String, default: 'Task' },
    },
    statuses: { type: [StatusConfigSchema], default: DEFAULT_STATUSES },
  },
  { timestamps: true }
);

// Always delete the cached model so schema changes are picked up without
// restarting the server. Safe in production (module evaluated once per
// cold start) and in development (hot-reload re-evaluates this file).
delete (mongoose.models as Record<string, unknown>).WorkspaceSettings;

const WorkspaceSettings: Model<IWorkspaceSettingsDocument> =
  mongoose.model<IWorkspaceSettingsDocument>('WorkspaceSettings', WorkspaceSettingsSchema);

export default WorkspaceSettings;

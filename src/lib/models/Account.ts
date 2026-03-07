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

export interface IEmbeddedMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface IEmbeddedSettings {
  users: IUserConfig[];
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  allowWeekends: boolean;
}

export interface IAccountDocument extends Document {
  name: string;
  slug: string;
  plan: 'trial' | 'monthly-5' | 'yearly-5' | 'monthly-20' | 'yearly-20';
  trialEndsAt: Date;
  status: 'active' | 'suspended' | 'cancelled';
  createdBy: string;
  members: IEmbeddedMember[];
  settings: IEmbeddedSettings;
  stripeCustomerId?: string;
}

const MemberSchema = new Schema<IEmbeddedMember>(
  {
    userId:   { type: String, required: true },
    role:     { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserConfigSchema = new Schema(
  {
    uid:   { type: String, required: true },
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

const SettingsSchema = new Schema(
  {
    users:         { type: [UserConfigSchema], default: [] },
    allowWeekends: { type: Boolean, default: false },
    levelNames: {
      epic:    { type: String, default: 'Epic' },
      feature: { type: String, default: 'Feature' },
      task:    { type: String, default: 'Task' },
    },
    statuses: { type: [StatusConfigSchema], default: DEFAULT_STATUSES },
  },
  { _id: false }
);

const AccountSchema = new Schema<IAccountDocument>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan:        { type: String, enum: ['trial', 'monthly-5', 'yearly-5', 'monthly-20', 'yearly-20'], default: 'trial' },
    stripeCustomerId: { type: String, sparse: true, index: true },
    trialEndsAt: { type: Date, required: true },
    status:      { type: String, enum: ['active', 'suspended', 'cancelled'], default: 'active' },
    createdBy:   { type: String, required: true, index: true },
    members:     { type: [MemberSchema], default: [] },
    settings:    { type: SettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

AccountSchema.index({ 'members.userId': 1 });

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Account;
}

const Account: Model<IAccountDocument> =
  (mongoose.models.Account as Model<IAccountDocument>) ||
  mongoose.model<IAccountDocument>('Account', AccountSchema);

export default Account;

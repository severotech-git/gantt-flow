export type StatusType = string;

export type AppLocale = 'en' | 'pt-BR' | 'es';
export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'pt-BR', 'es'];

export type TimelineScale = 'week' | 'month' | 'quarter';

// ─── Account / Multi-tenant ───────────────────────────────────────────────────

export interface IAccountMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface IAccount {
  _id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'monthly-5' | 'yearly-5' | 'monthly-20' | 'yearly-20';
  trialEndsAt: string;
  status: 'active' | 'suspended' | 'cancelled';
  createdBy: string;
  members: IAccountMember[];
  settings: IWorkspaceSettings;
  stripeCustomerId?: string;
  onboardingComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPlan {
  _id: string;
  name: string;
  slug: string;
  stripeProductId: string;
  stripePriceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  maxMembers: number;
  isActive: boolean;
  displayOrder: number;
}

export interface ISubscription {
  _id: string;
  accountId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: string;
  plan?: IPlan;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  _id: string;
  accountId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  invoiceUrl?: string;
  invoicePdf?: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IInvitation {
  _id: string;
  accountId: string;
  invitedByUserId: string;
  email: string;
  token: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  expiresAt: string;
  createdAt: string;
  // Populated fields (optional, returned by API)
  accountName?: string;
  inviterName?: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface IStatusConfig {
  value: string;
  label: string;
  color: string;
  isFinal?: boolean;
  isSystem?: boolean;
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

export interface IComment {
  _id: string;
  authorId: string;
  text: string;
  createdAt: string;
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
  description?: string;
  color?: string;
  dayCount?: number;
  comments?: IComment[];
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
  description?: string;
  color?: string;
  dayCount?: number;
  collapsed?: boolean;
  comments?: IComment[];
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
  description?: string;
  color?: string;
  dayCount?: number;
  collapsed?: boolean;
  comments?: IComment[];
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  currentVersion: string;
  archived?: boolean;
  accountId: string;
  createdBy: string;
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

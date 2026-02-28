import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Sub-document schemas ────────────────────────────────────────────────────

const TaskSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    notes:         { type: String },
    color:         { type: String },
  },
  { _id: true }
);

const FeatureSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    color:         { type: String },
    tasks:         { type: [TaskSchema], default: [] },
  },
  { _id: true }
);

const EpicSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    color:         { type: String },
    features:      { type: [FeatureSchema], default: [] },
  },
  { _id: true }
);

// ─── Root Project schema ─────────────────────────────────────────────────────

export interface IProjectDocument extends Document {
  name: string;
  description?: string;
  color?: string;
  currentVersion: string;
  archived: boolean;
  epics: mongoose.Types.DocumentArray<mongoose.Document>;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    name:           { type: String, required: true, trim: true },
    description:    { type: String },
    color:          { type: String, default: '#6366f1' },
    currentVersion: { type: String, default: 'Live' },
    archived:       { type: Boolean, default: false },
    epics:          { type: [EpicSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Model ───────────────────────────────────────────────────────────────────

delete (mongoose.models as Record<string, unknown>).Project;

const Project: Model<IProjectDocument> =
  mongoose.model<IProjectDocument>('Project', ProjectSchema);

export default Project;

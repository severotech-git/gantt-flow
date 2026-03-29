import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Sub-document schemas ────────────────────────────────────────────────────

const CommentSchema = new Schema(
  {
    authorId:  { type: String, required: true },
    text:      { type: String, required: true, maxlength: 5000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true, maxlength: 255 },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    notes:         { type: String, maxlength: 5000 },
    description:   { type: String, maxlength: 5000 },
    color:         { type: String, maxlength: 7 },
    dayCount:      { type: Number },
    comments:      { type: [CommentSchema], default: [] },
  },
  { _id: true }
);

const FeatureSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true, maxlength: 255 },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    description:   { type: String, maxlength: 5000 },
    color:         { type: String, maxlength: 7 },
    dayCount:      { type: Number },
    collapsed:     { type: Boolean, default: false },
    tasks:         { type: [TaskSchema], default: [] },
    comments:      { type: [CommentSchema], default: [] },
  },
  { _id: true }
);

const EpicSchema = new Schema(
  {
    name:          { type: String, required: true, trim: true, maxlength: 255 },
    status:        { type: String, default: 'todo' },
    ownerId:       { type: String },   // references IUserConfig.uid
    completionPct: { type: Number, min: 0, max: 100, default: 0 },
    plannedStart:  { type: Date, required: true },
    plannedEnd:    { type: Date, required: true },
    actualStart:   { type: Date },
    actualEnd:     { type: Date },
    description:   { type: String, maxlength: 5000 },
    color:         { type: String, maxlength: 7 },
    dayCount:      { type: Number },
    collapsed:     { type: Boolean, default: false },
    features:      { type: [FeatureSchema], default: [] },
    comments:      { type: [CommentSchema], default: [] },
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
  accountId: mongoose.Types.ObjectId;
  createdBy: string;
  epics: mongoose.Types.DocumentArray<mongoose.Document>;
}

const ProjectSchema = new Schema<IProjectDocument>(
  {
    name:           { type: String, required: true, trim: true, maxlength: 255 },
    description:    { type: String, maxlength: 5000 },
    color:          { type: String, default: '#6366f1', maxlength: 7 },
    currentVersion: { type: String, default: 'Live', maxlength: 255 },
    archived:       { type: Boolean, default: false },
    accountId:      { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    createdBy:      { type: String, required: true, index: true },
    epics:          { type: [EpicSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Model ───────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Project;
}

const Project: Model<IProjectDocument> =
  (mongoose.models.Project as Model<IProjectDocument>) ||
  mongoose.model<IProjectDocument>('Project', ProjectSchema);

export default Project;

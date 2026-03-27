import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISharedLinkDocument extends Document {
  token: string;
  projectId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  mode: 'snapshot' | 'live';
  /** Reference to ProjectSnapshot._id when mode === 'snapshot' */
  snapshotId?: mongoose.Types.ObjectId;
  expiresAt: Date;
  emails: string[];
  createdBy: string;
  revokedAt?: Date;
}

const SharedLinkSchema = new Schema<ISharedLinkDocument>(
  {
    token: { type: String, required: true, unique: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    mode: { type: String, enum: ['snapshot', 'live'], required: true },
    snapshotId: { type: Schema.Types.ObjectId, ref: 'ProjectSnapshot' },
    expiresAt: { type: Date, required: true },
    emails: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// TTL index: MongoDB auto-deletes expired documents
SharedLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Compound index for listing active shares
SharedLinkSchema.index({ projectId: 1, revokedAt: 1 });

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).SharedLink;
}

const SharedLink: Model<ISharedLinkDocument> =
  (mongoose.models.SharedLink as Model<ISharedLinkDocument>) ||
  mongoose.model<ISharedLinkDocument>('SharedLink', SharedLinkSchema);

export default SharedLink;

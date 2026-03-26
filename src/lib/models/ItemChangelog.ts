import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemChangelogDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  epicId: string;
  featureId?: string;
  taskId?: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string;
  changedAt: Date;
}

const ItemChangelogSchema = new Schema<IItemChangelogDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    epicId: { type: String, required: true },
    featureId: { type: String },
    taskId: { type: String },
    field: { type: String, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    userId: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient per-item fetches sorted by time
ItemChangelogSchema.index({
  projectId: 1,
  epicId: 1,
  featureId: 1,
  taskId: 1,
  changedAt: -1,
});

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).ItemChangelog;
}

const ItemChangelog: Model<IItemChangelogDocument> =
  (mongoose.models.ItemChangelog as Model<IItemChangelogDocument>) ||
  mongoose.model<IItemChangelogDocument>('ItemChangelog', ItemChangelogSchema);

export default ItemChangelog;

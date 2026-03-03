import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProjectSnapshotDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  versionName: string;
  snapshotData: Record<string, unknown>;
  createdAt: Date;
}

const ProjectSnapshotSchema = new Schema<IProjectSnapshotDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    versionName: { type: String, required: true, trim: true },
    snapshotData: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).ProjectSnapshot;
}

const ProjectSnapshot: Model<IProjectSnapshotDocument> =
  (mongoose.models.ProjectSnapshot as Model<IProjectSnapshotDocument>) ||
  mongoose.model<IProjectSnapshotDocument>('ProjectSnapshot', ProjectSnapshotSchema);

export default ProjectSnapshot;

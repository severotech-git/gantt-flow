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

const ProjectSnapshot: Model<IProjectSnapshotDocument> =
  mongoose.models.ProjectSnapshot ??
  mongoose.model<IProjectSnapshotDocument>('ProjectSnapshot', ProjectSnapshotSchema);

export default ProjectSnapshot;

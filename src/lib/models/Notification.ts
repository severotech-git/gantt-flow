import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationDocument extends Document {
  recipientUserId: string;
  type: 'comment' | 'mention' | 'status-change' | 'assignment' | 'item-update';
  projectId: string;
  projectName: string;
  itemPath: {
    epicId: string;
    featureId?: string;
    taskId?: string;
  };
  itemName: string;
  actorUserId: string;
  actorName: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientUserId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['comment', 'mention', 'status-change', 'assignment', 'item-update'],
      required: true,
    },
    projectId: {
      type: String,
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    itemPath: {
      epicId: {
        type: String,
        required: true,
      },
      featureId: String,
      taskId: String,
    },
    itemName: {
      type: String,
      required: true,
    },
    actorUserId: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // use explicit createdAt
  }
);

// Compound index for efficient queries
NotificationSchema.index({ recipientUserId: 1, read: 1, createdAt: -1 });

// TTL index: auto-delete notifications after 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Force schema reload on hot-reload in development only
if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Notification;
}

const Notification: Model<INotificationDocument> =
  (mongoose.models.Notification as Model<INotificationDocument>) ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export default Notification;

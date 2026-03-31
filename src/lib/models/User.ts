import mongoose, { Schema, Document, Model } from 'mongoose';
import type { INotificationPreferences } from '@/types/index.js';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  emailVerified?: Date | null;
  passwordHash?: string;
  image?: string;
  mainAccountId?: string | null;
  theme: 'dark' | 'light' | 'system';
  locale: 'en' | 'pt-BR' | 'es';
  ganttScale: 'week' | 'month' | 'quarter';
  notificationPreferences?: INotificationPreferences;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    passwordHash: {
      type: String,
      select: false, // Don't return password by default
    },
    image: {
      type: String,
      maxlength: 2048,
    },
    mainAccountId: {
      type: String,
      default: null,
    },
    theme: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: 'system',
    },
    locale: {
      type: String,
      enum: ['en', 'pt-BR', 'es'],
      default: 'en',
    },
    ganttScale: {
      type: String,
      enum: ['week', 'month', 'quarter'],
      default: 'week',
    },
    notificationPreferences: {
      type: {
        itemsCreated: { type: String, enum: ['in-app', 'email', 'both', 'off'], default: 'both' },
        itemsOwned: { type: String, enum: ['in-app', 'email', 'both', 'off'], default: 'both' },
        mentions: { type: String, enum: ['in-app', 'email', 'both', 'off'], default: 'both' },
      },
      default: { itemsCreated: 'both', itemsOwned: 'both', mentions: 'both' },
    },
  },
  {
    timestamps: true,
  }
);

// Force schema reload on hot-reload in development only
if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).User;
}

const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  emailVerified?: Date | null;
  passwordHash?: string;
  image?: string;
  mainAccountId?: string | null;
  theme: 'dark' | 'light' | 'system';
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

// Force schema reload on hot-reload so new fields (e.g. theme) are always picked up
delete (mongoose.models as Record<string, unknown>).User;

const User: Model<IUserDocument> =
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;

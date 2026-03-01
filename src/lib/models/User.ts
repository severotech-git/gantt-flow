import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  emailVerified?: Date | null;
  passwordHash?: string;
  image?: string;
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
  },
  {
    timestamps: true,
  }
);

const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;

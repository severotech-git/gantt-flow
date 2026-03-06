import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPasswordReset extends Document {
  email: string;
  token: string;
  expiresAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  email: { type: String, required: true, lowercase: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired docs via MongoDB TTL index
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordReset: Model<IPasswordReset> =
  mongoose.models.PasswordReset ||
  mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);

export default PasswordReset;

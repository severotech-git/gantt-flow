import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailOTP extends Document {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

const EmailOTPSchema = new Schema<IEmailOTP>({
  email: { type: String, required: true, unique: true, lowercase: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
});

// Auto-delete after expiresAt (10min TTL index)
EmailOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailOTP: Model<IEmailOTP> =
  mongoose.models.EmailOTP ||
  mongoose.model<IEmailOTP>('EmailOTP', EmailOTPSchema);

export default EmailOTP;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailVerification extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  bypassToken?: string;
  bypassExpiresAt?: Date;
}

const EmailVerificationSchema = new Schema<IEmailVerification>({
  userId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  bypassToken: { type: String, sparse: true, index: true },
  bypassExpiresAt: { type: Date },
});

// Auto-delete after expiresAt (24h TTL index)
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification: Model<IEmailVerification> =
  mongoose.models.EmailVerification ||
  mongoose.model<IEmailVerification>('EmailVerification', EmailVerificationSchema);

export default EmailVerification;

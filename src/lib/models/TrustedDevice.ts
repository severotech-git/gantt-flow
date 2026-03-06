import mongoose, { Schema, Document, Model } from 'mongoose';

interface ITrustedDevice extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

const TrustedDeviceSchema = new Schema<ITrustedDevice>({
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete documents after expiresAt
TrustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TrustedDevice: Model<ITrustedDevice> =
  mongoose.models.TrustedDevice ||
  mongoose.model<ITrustedDevice>('TrustedDevice', TrustedDeviceSchema);

export default TrustedDevice;

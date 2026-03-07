import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriptionDocument extends Document {
  accountId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
}

const SubscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    accountId:            { type: String, required: true, index: true },
    stripeSubscriptionId: { type: String, required: true, unique: true },
    stripeCustomerId:     { type: String, required: true, index: true },
    planId:               { type: String, required: true },
    status:               { type: String, enum: ['active', 'past_due', 'canceled', 'unpaid', 'incomplete'], required: true },
    currentPeriodStart:   { type: Date, required: true },
    currentPeriodEnd:     { type: Date, required: true },
    cancelAtPeriodEnd:    { type: Boolean, default: false },
    canceledAt:           { type: Date },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Subscription;
}

const Subscription: Model<ISubscriptionDocument> =
  (mongoose.models.Subscription as Model<ISubscriptionDocument>) ||
  mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);

export default Subscription;

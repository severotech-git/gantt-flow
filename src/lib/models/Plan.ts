import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanDocument extends Document {
  name: string;
  slug: string;
  stripeProductId: string;
  stripePriceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  maxMembers: number;
  isActive: boolean;
  displayOrder: number;
}

const PlanSchema = new Schema<IPlanDocument>(
  {
    name:           { type: String, required: true },
    slug:           { type: String, required: true, unique: true },
    stripeProductId: { type: String, required: true },
    stripePriceId:  { type: String, required: true, unique: true },
    amount:         { type: Number, required: true },
    currency:       { type: String, default: 'brl' },
    interval:       { type: String, enum: ['month', 'year'], required: true },
    maxMembers:     { type: Number, required: true },
    isActive:       { type: Boolean, default: true },
    displayOrder:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Plan;
}

const Plan: Model<IPlanDocument> =
  (mongoose.models.Plan as Model<IPlanDocument>) ||
  mongoose.model<IPlanDocument>('Plan', PlanSchema);

export default Plan;

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentDocument extends Document {
  accountId: string;
  subscriptionId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  invoiceUrl?: string;
  invoicePdf?: string;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    accountId:       { type: String, required: true, index: true },
    subscriptionId:  { type: String, required: true },
    stripeInvoiceId: { type: String, required: true, unique: true },
    amount:          { type: Number, required: true },
    currency:        { type: String, required: true },
    status:          { type: String, enum: ['paid', 'open', 'void', 'uncollectible', 'draft'], required: true },
    invoiceUrl:      { type: String },
    invoicePdf:      { type: String },
    periodStart:     { type: Date, required: true },
    periodEnd:       { type: Date, required: true },
    paidAt:          { type: Date },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Payment;
}

const Payment: Model<IPaymentDocument> =
  (mongoose.models.Payment as Model<IPaymentDocument>) ||
  mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

export default Payment;

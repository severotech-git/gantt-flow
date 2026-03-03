import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvitationDocument extends Document {
  accountId: mongoose.Types.ObjectId;
  invitedByUserId: string;
  email: string;
  token: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  expiresAt: Date;
}

const InvitationSchema = new Schema<IInvitationDocument>(
  {
    accountId:       { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    invitedByUserId: { type: String, required: true },
    email:           { type: String, required: true, lowercase: true, trim: true },
    token:           { type: String, required: true, unique: true },
    role:            { type: String, enum: ['admin', 'member'], default: 'member' },
    status:          { type: String, enum: ['pending', 'accepted', 'rejected', 'canceled'], default: 'pending' },
    expiresAt:       { type: Date, required: true },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== 'production') {
  delete (mongoose.models as Record<string, unknown>).Invitation;
}

const Invitation: Model<IInvitationDocument> =
  (mongoose.models.Invitation as Model<IInvitationDocument>) ||
  mongoose.model<IInvitationDocument>('Invitation', InvitationSchema);

export default Invitation;

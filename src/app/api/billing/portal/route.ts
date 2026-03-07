import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import { stripe } from '@/lib/stripe';
import Account from '@/lib/models/Account';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const account = await Account.findOne(
      { _id: accountId, 'members.userId': userId },
      { 'members.$': 1, stripeCustomerId: 1 }
    ).lean();
    const role = account?.members?.[0]?.role;
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the account owner can manage billing' }, { status: 403 });
    }
    if (!account?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: account!.stripeCustomerId!,
      return_url: `${baseUrl}/settings?section=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[POST /api/billing/portal]', err);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}

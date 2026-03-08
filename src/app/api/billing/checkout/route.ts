import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import { stripe } from '@/lib/stripe';
import Account from '@/lib/models/Account';
import Plan from '@/lib/models/Plan';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    // Only owner can subscribe
    const account = await Account.findOne(
      { _id: accountId, 'members.userId': userId },
      { 'members.$': 1, stripeCustomerId: 1 }
    ).lean();
    const role = account?.members?.[0]?.role;
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the account owner can subscribe', code: 'OWNER_ONLY' }, { status: 403 });
    }

    const { priceId } = await req.json();
    if (!priceId) return NextResponse.json({ error: 'priceId is required', code: 'PRICE_ID_REQUIRED' }, { status: 400 });

    const plan = await Plan.findOne({ stripePriceId: priceId, isActive: true }).lean();
    if (!plan) return NextResponse.json({ error: 'Plan not found', code: 'PLAN_NOT_FOUND' }, { status: 404 });

    let stripeCustomerId = account?.stripeCustomerId;
    if (!stripeCustomerId) {
      const user = await User.findById(userId, { email: 1, name: 1 }).lean();
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { accountId },
      });
      stripeCustomerId = customer.id;
      await Account.findByIdAndUpdate(accountId, { stripeCustomerId });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?section=billing&checkout=success`,
      cancel_url: `${baseUrl}/settings?section=billing&checkout=cancelled`,
      metadata: { accountId },
      subscription_data: { metadata: { accountId } },
      tax_id_collection: { enabled: true },
      billing_address_collection: 'required',
      customer_update: { address: 'auto', name: 'auto' },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[POST /api/billing/checkout]', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}

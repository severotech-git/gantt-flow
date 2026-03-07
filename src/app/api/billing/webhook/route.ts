import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';

// In Stripe API 2026-02-25.clover, current_period_start/end moved from the
// Subscription root into items.data[0]. This helper reads from both locations.
function getSubPeriod(sub: Stripe.Subscription): { start: number | undefined; end: number | undefined } {
  // New API: fields live on the first subscription item
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number }) | undefined;
  const start = item?.current_period_start ?? (sub as unknown as Record<string, number>).current_period_start;
  const end   = item?.current_period_end   ?? (sub as unknown as Record<string, number>).current_period_end;
  return { start, end };
}

interface LegacyInvoice {
  id: string;
  subscription: string | null;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  amount_paid: number;
  currency: string;
  status_transitions: { paid_at: number | null } | null;
}
import { connectDB } from '@/lib/mongodb';
import Account from '@/lib/models/Account';
import Plan from '@/lib/models/Plan';
import Subscription from '@/lib/models/Subscription';
import Payment from '@/lib/models/Payment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await connectDB();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = session.metadata?.accountId;
        if (!accountId || !session.subscription) break;

        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = stripeSub.items.data[0]?.price?.id;
        const plan = priceId ? await Plan.findOne({ stripePriceId: priceId }).lean() : null;
        const { start, end } = getSubPeriod(stripeSub);

        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          {
            accountId,
            stripeSubscriptionId: stripeSub.id,
            stripeCustomerId: stripeSub.customer as string,
            planId: plan?._id?.toString() ?? '',
            status: stripeSub.status as 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete',
            currentPeriodStart: start ? new Date(start * 1000) : new Date(),
            currentPeriodEnd: end ? new Date(end * 1000) : new Date(),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          },
          { upsert: true, returnDocument: 'after' }
        );

        if (plan) {
          await Account.findByIdAndUpdate(accountId, {
            plan: plan.slug,
            status: 'active',
          });
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as LegacyInvoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const sub = await Subscription.findOne({ stripeSubscriptionId: subId });
        if (!sub) break;

        await Payment.findOneAndUpdate(
          { stripeInvoiceId: invoice.id },
          {
            accountId: sub.accountId,
            subscriptionId: sub._id.toString(),
            stripeInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            invoiceUrl: invoice.hosted_invoice_url ?? undefined,
            invoicePdf: invoice.invoice_pdf ?? undefined,
            periodStart: new Date((invoice.period_start) * 1000),
            periodEnd: new Date((invoice.period_end) * 1000),
            paidAt: invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : new Date(),
          },
          { upsert: true, new: true }
        );

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const { start: pStart, end: pEnd } = getSubPeriod(stripeSub);
        const periodUpdate: Record<string, unknown> = { status: stripeSub.status };
        if (pStart) periodUpdate.currentPeriodStart = new Date(pStart * 1000);
        if (pEnd)   periodUpdate.currentPeriodEnd   = new Date(pEnd * 1000);
        await Subscription.findByIdAndUpdate(sub._id, periodUpdate);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as LegacyInvoice;
        const subId = invoice.subscription as string | null;
        if (!subId) break;

        const sub = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: subId },
          { status: 'past_due' },
          { returnDocument: 'after' }
        );
        if (sub) {
          await Account.findByIdAndUpdate(sub.accountId, { status: 'suspended' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const priceId = stripeSub.items.data[0]?.price?.id;
        const plan = priceId ? await Plan.findOne({ stripePriceId: priceId }).lean() : null;
        const { start: uStart, end: uEnd } = getSubPeriod(stripeSub);

        const updateData: Record<string, unknown> = {
          status: stripeSub.status,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        };
        if (uStart) updateData.currentPeriodStart = new Date(uStart * 1000);
        if (uEnd)   updateData.currentPeriodEnd   = new Date(uEnd * 1000);
        if (plan) updateData.planId = plan._id?.toString();

        const sub = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          updateData,
          { returnDocument: 'after' }
        );

        if (sub && plan) {
          await Account.findByIdAndUpdate(sub.accountId, { plan: plan.slug });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;

        const sub = await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          {
            status: 'canceled',
            canceledAt: new Date(),
          },
          { returnDocument: 'after' }
        );

        if (sub) {
          await Account.findByIdAndUpdate(sub.accountId, {
            plan: 'trial',
            status: 'suspended',
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}

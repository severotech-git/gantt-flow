import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { getAccountSubscription } from '@/lib/billing';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    const sub = await getAccountSubscription(accountId);
    return NextResponse.json(sub ?? null);
  } catch (err) {
    console.error('[GET /api/billing/subscription]', err);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

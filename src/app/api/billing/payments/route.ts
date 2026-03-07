import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import Payment from '@/lib/models/Payment';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const account = await Account.findOne(
      { _id: accountId, 'members.userId': userId },
      { 'members.$': 1 }
    ).lean();
    const role = account?.members?.[0]?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payments = await Payment.find({ accountId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(payments);
  } catch (err) {
    console.error('[GET /api/billing/payments]', err);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

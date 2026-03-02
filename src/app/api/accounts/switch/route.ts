import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';

export const runtime = 'nodejs';

// POST /api/accounts/switch – validate membership before client updates the JWT
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { accountId } = await req.json();
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 });

    const account = await Account.findOne({ _id: accountId, 'members.userId': userId }, { _id: 1 }).lean();
    if (!account) return NextResponse.json({ error: 'Not a member of this account' }, { status: 403 });

    return NextResponse.json({ ok: true, activeAccountId: accountId });
  } catch (err) {
    console.error('[POST /api/accounts/switch]', err);
    return NextResponse.json({ error: 'Failed to switch account' }, { status: 500 });
  }
}

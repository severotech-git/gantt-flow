import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

// POST /api/accounts/main – set the user's preferred default account
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

    await User.findByIdAndUpdate(userId, { mainAccountId: accountId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/accounts/main]', err);
    return NextResponse.json({ error: 'Failed to set main account' }, { status: 500 });
  }
}

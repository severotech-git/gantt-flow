import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// GET /api/accounts/[id]/members – list members with enriched user info
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id } = await params;

    const account = await Account.findById(id).lean();
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isMember = account.members.some((m) => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userIds = account.members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }, { name: 1, email: 1, image: 1 }).lean();
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    const result = account.members.map((m) => ({
      ...m,
      user: userMap[m.userId] ?? null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/accounts/[id]/members]', err);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

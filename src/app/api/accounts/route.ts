import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account, { DEFAULT_STATUSES } from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

// GET /api/accounts – list all accounts the current user is a member of
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const [accounts, user] = await Promise.all([
      Account.find({ 'members.userId': userId }).lean(),
      User.findById(userId, { mainAccountId: 1 }).lean(),
    ]);

    const result = accounts.map((acc) => {
      const member = acc.members.find((m) => m.userId === userId);
      return { ...acc, role: member?.role ?? 'member' };
    });

    return NextResponse.json({ accounts: result, mainAccountId: user?.mainAccountId ?? null });
  } catch (err) {
    console.error('[GET /api/accounts]', err);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/accounts – create a new account
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const name = body.name.trim();
    if (name.length > 255) {
      return NextResponse.json({ error: 'name must be 255 characters or fewer' }, { status: 400 });
    }
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
    const existing = await Account.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const user = await User.findById(userId);

    const account = await Account.create({
      name,
      slug,
      plan: 'trial',
      trialEndsAt,
      createdBy: userId,
      members: [{ userId, role: 'owner', joinedAt: new Date() }],
      settings: {
        users: [{ uid: userId, name: user?.name ?? 'You', color: '#6366f1' }],
        statuses: DEFAULT_STATUSES,
        levelNames: { epic: 'Epic', feature: 'Feature', task: 'Task' },
        allowWeekends: false,
      },
    });

    return NextResponse.json({ ...account.toObject(), role: 'owner' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/accounts]', err);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

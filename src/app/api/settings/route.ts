import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth, requireManage } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();
    const [account, user] = await Promise.all([
      Account.findById(accountId, { settings: 1 }).lean(),
      User.findById(userId, { theme: 1 }).lean(),
    ]);

    return NextResponse.json({
      ...(account?.settings ?? {}),
      theme: user?.theme ?? 'system',
    });
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Fields only owner/admin may change
const MANAGED_FIELDS = ['levelNames', 'statuses', 'allowWeekends'] as const;
// Fields any authenticated member may change (account-level)
const MEMBER_ACCOUNT_FIELDS = ['users'] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const needsManage = MANAGED_FIELDS.some((k) => k in body);

    const authResult = needsManage
      ? await requireManage()
      : await requireAuth();

    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const ops: Promise<unknown>[] = [];

    // theme → User document
    if ('theme' in body) {
      ops.push(User.findByIdAndUpdate(userId, { $set: { theme: body.theme } }));
    }

    // account-level fields
    const $set: Record<string, unknown> = {};
    for (const key of MEMBER_ACCOUNT_FIELDS) {
      if (key in body) $set[`settings.${key}`] = body[key];
    }
    if (needsManage) {
      for (const key of MANAGED_FIELDS) {
        if (key in body) $set[`settings.${key}`] = body[key];
      }
    }
    if (Object.keys($set).length > 0) {
      ops.push(
        Account.findByIdAndUpdate(accountId, { $set }, { new: true, runValidators: false })
      );
    }

    await Promise.all(ops);

    // Return merged settings so the frontend state stays consistent
    const [account, user] = await Promise.all([
      Account.findById(accountId, { settings: 1 }).lean(),
      User.findById(userId, { theme: 1 }).lean(),
    ]);

    return NextResponse.json({
      ...(account?.settings ?? {}),
      theme: user?.theme ?? 'system',
    });
  } catch (err) {
    console.error('[settings PATCH]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

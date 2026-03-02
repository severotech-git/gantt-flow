import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/accounts/[id] – update account name (owner or admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id } = await params;

    const account = await Account.findById(id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const member = (account.members ?? []).find((m) => m.userId === userId);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    account.name = body.name.trim();
    await account.save();

    return NextResponse.json(account.toObject());
  } catch (err) {
    console.error('[PATCH /api/accounts/[id]]', err);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

// DELETE /api/accounts/[id] – delete account (owner only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id } = await params;

    const account = await Account.findById(id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const member = (account.members ?? []).find((m) => m.userId === userId);
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden – owner only' }, { status: 403 });
    }

    await account.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/accounts/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

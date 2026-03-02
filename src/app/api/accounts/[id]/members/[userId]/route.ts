import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; userId: string }> };

// PATCH /api/accounts/[id]/members/[userId] – change a member's role
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId: requesterId } = authResult;

    await connectDB();
    const { id, userId: targetUserId } = await params;
    const { role: newRole } = await req.json();

    if (!['admin', 'member'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const account = await Account.findById(id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const members = account.members ?? [];
    const requester = members.find((m) => m.userId === requesterId);
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = members.find((m) => m.userId === targetUserId);
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner role' }, { status: 400 });
    }
    // Admins can only manage plain members, not other admins
    if (requester.role === 'admin' && target.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot change other admins' }, { status: 403 });
    }

    target.role = newRole as 'admin' | 'member';
    await account.save();

    return NextResponse.json({ ok: true, role: newRole });
  } catch (err) {
    console.error('[PATCH /api/accounts/[id]/members/[userId]]', err);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/accounts/[id]/members/[userId] – remove a member (owner/admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId: requesterId } = authResult;

    await connectDB();
    const { id, userId: targetUserId } = await params;

    const account = await Account.findById(id);
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const members = account.members ?? [];
    const requester = members.find((m) => m.userId === requesterId);
    if (!requester || !['owner', 'admin'].includes(requester.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = members.find((m) => m.userId === targetUserId);
    if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the account owner' }, { status: 400 });
    }

    account.members = members.filter((m) => m.userId !== targetUserId) as typeof account.members;
    await account.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/accounts/[id]/members/[userId]]', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}

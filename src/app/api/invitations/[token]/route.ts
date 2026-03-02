import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Invitation from '@/lib/models/Invitation';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

// GET /api/invitations/[token] – public: view invite details (no auth required)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { token } = await params;

    const invitation = await Invitation.findOne({ token }).lean();
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already used', status: invitation.status }, { status: 410 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
    }

    const [account, inviter] = await Promise.all([
      Account.findById(invitation.accountId, { name: 1, slug: 1 }).lean(),
      User.findById(invitation.invitedByUserId, { name: 1 }).lean(),
    ]);

    return NextResponse.json({
      ...invitation,
      accountName: account?.name ?? 'Unknown account',
      inviterName: inviter?.name ?? 'A teammate',
    });
  } catch (err) {
    console.error('[GET /api/invitations/[token]]', err);
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 });
  }
}

// PATCH /api/invitations/[token] – cancel a pending invitation (owner/admin only)
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();
    const { token } = await params;

    const invitation = await Invitation.findOne({ token });
    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    if (invitation.accountId.toString() !== accountId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const account = await Account.findOne({ _id: accountId, 'members.userId': userId }, { 'members.$': 1 }).lean();
    const role = account?.members?.[0]?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    invitation.status = 'canceled';
    await invitation.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/invitations/[token]]', err);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
}

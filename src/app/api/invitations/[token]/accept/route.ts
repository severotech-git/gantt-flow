import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Invitation from '@/lib/models/Invitation';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { canAddMember } from '@/lib/billing';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

// POST /api/invitations/[token]/accept
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { token } = await params;

    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 410 });
    }

    const user = await User.findById(userId);
    if (!user || user.email !== invitation.email) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
    }

    const accountId = invitation.accountId;

    const account = await Account.findById(accountId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Member limit check
    const memberLimit = await canAddMember(accountId.toString());
    if (!memberLimit.allowed) {
      return NextResponse.json(
        { error: 'Member limit reached', max: memberLimit.max, current: memberLimit.current },
        { status: 403 }
      );
    }

    // Atomically add member only if not already present (prevents duplicates under any race condition)
    await Account.updateOne(
      { _id: accountId, 'members.userId': { $ne: userId } },
      { $push: { members: { userId, role: invitation.role, joinedAt: new Date() } } }
    );

    // Add user to embedded settings.users if not already present
    await Account.updateOne(
      { _id: accountId, 'settings.users.uid': { $ne: userId } },
      { $push: { 'settings.users': { uid: userId, name: user.name, color: '#6366f1' } } }
    );

    await Invitation.findByIdAndUpdate(invitation._id, { status: 'accepted' });

    return NextResponse.json({ ok: true, accountId: accountId.toString() });
  } catch (err) {
    console.error('[POST /api/invitations/[token]/accept]', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}

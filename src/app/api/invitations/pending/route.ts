import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Invitation from '@/lib/models/Invitation';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

// GET /api/invitations/pending – list pending invitations addressed to the current user's email
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();

    const currentUser = await User.findById(userId);
    if (!currentUser) return NextResponse.json([], { status: 200 });

    const now = new Date();
    const invitations = await Invitation.find({
      email: currentUser.email,
      status: 'pending',
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich with account + inviter name
    const result = await Promise.all(
      invitations.map(async (inv) => {
        const [account, inviter] = await Promise.all([
          Account.findById(inv.accountId, { name: 1 }).lean(),
          User.findById(inv.invitedByUserId, { name: 1 }).lean(),
        ]);
        return {
          ...inv,
          accountName: account?.name ?? 'Unknown account',
          inviterName: inviter?.name ?? 'A teammate',
        };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/invitations/pending]', err);
    return NextResponse.json({ error: 'Failed to fetch pending invitations' }, { status: 500 });
  }
}

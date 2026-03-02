import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Invitation from '@/lib/models/Invitation';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

// POST /api/invitations/[token]/reject – reject an invitation
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { token } = await params;

    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 });

    const user = await User.findById(userId);
    if (!user || user.email !== invitation.email) {
      return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
    }

    await Invitation.findByIdAndUpdate(invitation._id, { status: 'rejected' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/invitations/[token]/reject]', err);
    return NextResponse.json({ error: 'Failed to reject invitation' }, { status: 500 });
  }
}

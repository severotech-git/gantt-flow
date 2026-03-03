import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Invitation from '@/lib/models/Invitation';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import { sendInvitationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function inviteExpiresAt(): Date {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

// GET /api/invitations – list pending invitations for the current account
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const account = await Account.findOne({ _id: accountId, 'members.userId': userId }, { 'members.$': 1 }).lean();
    const role = account?.members?.[0]?.role;
    if (!role || !['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await Invitation.find({ accountId, status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(invitations);
  } catch (err) {
    console.error('[GET /api/invitations]', err);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

// POST /api/invitations – send an invitation email
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const accountDoc = await Account.findOne({ _id: accountId, 'members.userId': userId }, { 'members.$': 1, name: 1 }).lean();
    const posterRole = accountDoc?.members?.[0]?.role;
    if (!posterRole || !['owner', 'admin'].includes(posterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit: 20 invitations per account per hour
    const rl = checkRateLimit(`invite:${accountId}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many invitations sent. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const { email, role = 'member' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already a member
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const fullAccount = await Account.findOne({ _id: accountId, 'members.userId': existingUser._id.toString() }, { _id: 1 }).lean();
      if (fullAccount) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
      }
    }

    // Block duplicate invite unless the existing one is expired
    const existingInvite = await Invitation.findOne({ accountId, email: normalizedEmail, status: 'pending' });
    if (existingInvite) {
      if (existingInvite.expiresAt > new Date()) {
        return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
      }
      await existingInvite.deleteOne();
    }

    const invitation = await Invitation.create({
      accountId,
      invitedByUserId: userId,
      email: normalizedEmail,
      role,
      token: generateToken(),
      expiresAt: inviteExpiresAt(),
    });

    const inviter = await User.findById(userId, { name: 1 }).lean();
    const inviteUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/invite/${invitation.token}`;

    try {
      await sendInvitationEmail(
        normalizedEmail,
        inviter?.name ?? 'A teammate',
        accountDoc?.name ?? 'Your team',
        inviteUrl
      );
    } catch (emailErr) {
      console.error('[POST /api/invitations] Email send failed', emailErr);
    }

    return NextResponse.json(invitation.toObject(), { status: 201 });
  } catch (err) {
    console.error('[POST /api/invitations]', err);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

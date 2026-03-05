import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import EmailVerification from '@/lib/models/EmailVerification';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.emailVerified) {
    return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
  }

  // Rate limit: 3 resends per 15 minutes per user
  const rl = checkRateLimit(`resend:${session.user.id}`, 3, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many resend attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // Regenerate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await EmailVerification.findOneAndUpdate(
      { userId: session.user.id },
      { token, expiresAt, $unset: { bypassToken: '', bypassExpiresAt: '' } },
      { upsert: true, new: true }
    );

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    await sendVerificationEmail(user.email, verifyUrl);

    return NextResponse.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('[verify-email/resend] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

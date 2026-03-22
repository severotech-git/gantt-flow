import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import EmailOTP from '@/lib/models/EmailOTP';
import { sendMFACode } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let email: string;
  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Rate limit: 1 resend per 2 minutes per email
  const rl = checkRateLimit(`mfa-resend:${email}`, 1, 2 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many resend attempts. Please wait before trying again.', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  try {
    await connectDB();

    // Verify user exists (return generic 200 even if not, to prevent enumeration)
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'Code sent' });
    }

    // Only resend if there is an active OTP document (proves a login flow was started)
    const existing = await EmailOTP.findOne({ email });
    if (!existing) {
      return NextResponse.json({ message: 'Code sent' });
    }

    // Generate new OTP
    const crypto = await import('crypto');
    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = await bcrypt.hash(code, 10);

    await EmailOTP.deleteOne({ email });
    await EmailOTP.create({
      email,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    try {
      await sendMFACode(email, code, user.locale);
    } catch (err) {
      console.error('[mfa/resend] Failed to send MFA code:', err);
    }

    return NextResponse.json({ message: 'Code sent' });
  } catch (err) {
    console.error('[mfa/resend] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/lib/models/PasswordReset';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const GENERIC_OK = { message: 'If that email exists, a reset link has been sent.' };

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipLimit = checkRateLimit(`forgot:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(GENERIC_OK, { status: 200 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? '').toString().toLowerCase().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const emailLimit = checkRateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) {
    return NextResponse.json(GENERIC_OK, { status: 200 });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      // Prevent enumeration — always return generic response
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    // One active token at a time
    await PasswordReset.deleteMany({ email });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await PasswordReset.create({ email, token, expiresAt });

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (err) {
    console.error('[forgot-password] Error:', err);
    // Still return generic to avoid leaking server errors
    return NextResponse.json(GENERIC_OK, { status: 200 });
  }
}

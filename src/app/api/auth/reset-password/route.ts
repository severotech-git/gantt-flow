import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import PasswordReset from '@/lib/models/PasswordReset';
import { validatePassword } from '@/lib/passwordPolicy';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipLimit = checkRateLimit(`resetpwd:ip:${ip}`, 5, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.', code: 'TOO_MANY_ATTEMPTS' },
      { status: 429 }
    );
  }

  let token: string, password: string, confirmPassword: string;
  try {
    const body = await request.json();
    token = (body.token ?? '').toString().trim();
    password = (body.password ?? '').toString();
    confirmPassword = (body.confirmPassword ?? '').toString();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Token is required.', code: 'TOKEN_REQUIRED' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: 'Passwords do not match.', code: 'PASSWORD_MISMATCH' }, { status: 400 });
  }

  const pwError = validatePassword(password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  try {
    await connectDB();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await PasswordReset.findOne({ token: tokenHash });
    if (!reset || reset.expiresAt < new Date()) {
      if (reset) await PasswordReset.deleteOne({ _id: reset._id });
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.', code: 'TOKEN_INVALID_OR_EXPIRED' },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await User.findOneAndUpdate(
      { email: reset.email },
      {
        $set: {
          passwordHash,
          // OAuth-only users gain credentials login; mark email verified if not yet
          emailVerified: new Date(),
        },
      }
    );

    // Single-use: delete immediately
    await PasswordReset.deleteOne({ _id: reset._id });

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });
  } catch (err) {
    console.error('[reset-password] Error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import EmailVerification from '@/lib/models/EmailVerification';
import { seedAccountForNewUser } from '@/lib/seedWorkspace';
import { validatePassword } from '@/lib/passwordPolicy';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per IP per 24 hours
    const ip = getClientIp(request.headers, (request as unknown as { ip?: string }).ip);
    const rl = checkRateLimit(`register:${ip}`, 3, 24 * 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'TOO_MANY_ATTEMPTS' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { name, email, password, confirmPassword, locale } = body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }
    if (typeof name !== 'string' || name.trim().length > 100) {
      return NextResponse.json({ error: 'name must be 100 characters or fewer', code: 'NAME_TOO_LONG' }, { status: 400 });
    }
    if (typeof email !== 'string' || email.length > 254) {
      return NextResponse.json({ error: 'Invalid email format', code: 'EMAIL_INVALID' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match', code: 'PASSWORD_MISMATCH' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'EMAIL_INVALID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use', code: 'EMAIL_ALREADY_IN_USE' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Validate and resolve locale
    const VALID_LOCALES = ['en', 'pt-BR', 'es'];
    const resolvedLocale = VALID_LOCALES.includes(locale) ? locale : 'en';

    // Create user
    const newUser = await User.create({
      email: email.toLowerCase(),
      name,
      passwordHash,
      emailVerified: null,
      locale: resolvedLocale,
    });

    await seedAccountForNewUser(newUser._id.toString(), name);

    // Generate verification token (24h) and bypass token (60s)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const bypassToken = crypto.randomBytes(16).toString('hex');
    const now = Date.now();

    await EmailVerification.create({
      userId: newUser._id.toString(),
      token: verificationToken,
      expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      bypassToken,
      bypassExpiresAt: new Date(now + 60 * 1000),
    });

    // Send verification email (failure doesn't fail registration)
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
    try {
      await sendVerificationEmail(email.toLowerCase(), verifyUrl);
    } catch (err) {
      console.error('[register] Failed to send verification email:', err);
    }

    // Set the bypass token as an httpOnly cookie so it is never accessible from
    // JavaScript.  The credentials provider reads it server-side from the cookie
    // header; the client only sends a sentinel value ('__use_cookie__').
    const response = NextResponse.json(
      { message: 'User created successfully' },
      { status: 201 }
    );
    response.cookies.set('__bypass_token', bypassToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 65, // slightly longer than the 60 s DB validity window
      path: '/api/auth/callback/credentials',
    });
    response.cookies.set('NEXT_LOCALE', resolvedLocale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

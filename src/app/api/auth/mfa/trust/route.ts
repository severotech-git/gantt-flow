import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { connectDB } from '@/lib/mongodb';
import TrustedDevice from '@/lib/models/TrustedDevice';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  await connectDB();

  const userId = session.userId;

  // Read existing trust cookie to replace it (one active token per device)
  const existingCookie = req.cookies.get('__mfa_trust')?.value;
  if (existingCookie) {
    const existingHash = crypto.createHash('sha256').update(existingCookie).digest('hex');
    await TrustedDevice.deleteOne({ userId, tokenHash: existingHash });
  }

  // Generate new raw token — only the hash is stored in DB
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await TrustedDevice.create({ userId, tokenHash, expiresAt });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `__mfa_trust=${rawToken}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `MaxAge=${30 * 24 * 60 * 60}`,
    ...(isProduction ? ['Secure'] : []),
  ];

  return NextResponse.json(
    { ok: true },
    { headers: { 'Set-Cookie': cookieParts.join('; ') } }
  );
}

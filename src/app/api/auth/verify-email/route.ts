import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import EmailVerification from '@/lib/models/EmailVerification';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', request.url));
  }

  try {
    await connectDB();

    const verification = await EmailVerification.findOne({ token });

    if (!verification) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', request.url));
    }

    if (verification.expiresAt < new Date()) {
      await EmailVerification.deleteOne({ _id: verification._id });
      return NextResponse.redirect(new URL('/verify-email?error=expired', request.url));
    }

    // Mark user as verified
    await User.findByIdAndUpdate(verification.userId, {
      $set: { emailVerified: new Date() },
    });

    // Remove the verification doc (or leave for TTL — delete immediately is cleaner)
    await EmailVerification.deleteOne({ _id: verification._id });

    return NextResponse.redirect(new URL('/verify-email?success=1', request.url));
  } catch (err) {
    console.error('[verify-email] Error:', err);
    return NextResponse.redirect(new URL('/verify-email?error=server', request.url));
  }
}

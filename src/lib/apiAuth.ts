import { NextResponse } from 'next/server';

export interface AuthResult {
  userId: string;
}

/**
 * Extract and verify the current session for API routes.
 * Returns { userId } on success, or a 401 NextResponse on failure.
 * Dynamically imports auth to avoid loading Mongoose in edge runtime.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  // Dynamically import auth only when called (in Node.js runtime)
  const { auth } = await import('@/auth');
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return { userId: session.user.id };
}

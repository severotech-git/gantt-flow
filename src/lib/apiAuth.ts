import { NextResponse } from 'next/server';

export interface AuthResult {
  userId: string;
  accountId: string;
}

/**
 * Extract and verify the current session for API routes.
 * Returns { userId, accountId } on success, or a 401 NextResponse on failure.
 * Dynamically imports auth to avoid loading Mongoose in edge runtime.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  // Dynamically import auth only when called (in Node.js runtime)
  const { auth } = await import('@/auth');
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.activeAccountId) {
    return NextResponse.json({ error: 'No active account' }, { status: 403 });
  }

  return {
    userId: session.user.id,
    accountId: session.user.activeAccountId,
  };
}

/**
 * Like requireAuth(), but also verifies the user is an owner or admin
 * of the active account. Returns 403 for members.
 */
export async function requireManage(): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { connectDB } = await import('@/lib/mongodb');
  const Account = (await import('@/lib/models/Account')).default;

  await connectDB();
  const account = await Account.findOne(
    { _id: authResult.accountId, 'members.userId': authResult.userId },
    { 'members.$': 1 }
  ).lean();

  const role = (account as { members?: Array<{ role: string }> } | null)?.members?.[0]?.role;
  if (!role || !['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return authResult;
}

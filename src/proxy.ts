import { NextRequest, NextResponse } from 'next/server';
 
// @ts-expect-error – next-auth/jwt re-exports from @auth/core/jwt; TS resolves it at runtime
import { getToken } from 'next-auth/jwt';

// Fully public — no session required
const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth', '/invite', '/api/invitations', '/verify-mfa', '/forgot-password', '/reset-password', '/api/billing/webhook', '/api/billing/plans', '/shared', '/api/shared'];

// Accessible with a valid session even when email is not yet verified
const UNVERIFIED_OK_PATHS = [
  ...PUBLIC_PATHS,
  '/verify-email',
  '/api/auth/verify-email',
];


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (isPublic) return NextResponse.next();

  // Decode JWT to check auth + emailVerified (edge-safe — no DB call)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = await (getToken as any)({
    req: request,
    secret: process.env.AUTH_SECRET!,
    cookieName:
      request.cookies.get('__Secure-authjs.session-token') !== undefined
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
  }).catch(() => null);

  if (!token) {
    const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  if (!token.emailVerified) {
    const isUnverifiedOk = UNVERIFIED_OK_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );
    if (!isUnverifiedOk) {
      return NextResponse.redirect(new URL('/verify-email', request.url));
    }
  }

  // Paywall: trial expired or account suspended
  const plan = token.plan as string | undefined;
  const trialEndsAt = token.trialEndsAt as string | undefined;
  const accountStatus = token.accountStatus as string | undefined;

  const trialExpired =
    plan === 'trial' &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() < Date.now();

  const suspended = accountStatus === 'suspended';
  const isBlocked = trialExpired || suspended;

  if (isBlocked) {
    const PAYWALL_OK_PATHS = [
      '/api/billing',
      '/api/accounts',
      '/api/auth',
      '/api/settings',
      '/login',
      '/register',
    ];
    const isPaywallOk = PAYWALL_OK_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + '/')
    );

    // Allow /settings only when showing the billing section
    const isBillingSettings =
      pathname === '/settings' &&
      request.nextUrl.searchParams.get('section') === 'billing';

    if (!isPaywallOk && !isBillingSettings) {
      return NextResponse.redirect(
        new URL('/settings?section=billing&paywall=1', request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except next internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png|.*\\.svg|.*\\.ico).*)',
  ],
};

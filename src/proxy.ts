import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/api/auth'];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the path is public
  const isPublic = PUBLIC_PATHS.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // For protected routes, check for NextAuth session cookie
  // The cookie name is __Secure-authjs.session-token in production or authjs.session-token in development
  const sessionToken =
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('authjs.session-token')?.value;

  if (!sessionToken) {
    const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except next internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

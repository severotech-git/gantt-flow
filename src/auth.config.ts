// next-auth v5 beta type resolution doesn't fully align with bundler moduleResolution.
// The runtime behaviour is correct; only the TS import path is unresolvable in this mode.

// @ts-expect-error – next-auth type export unresolvable under moduleResolution:bundler
import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe auth configuration.
 * Must NOT import mongoose, mongodb, nodemailer, or any Node.js-only module.
 * Used by middleware.ts for JWT validation in the edge runtime.
 */
export const authConfig = {
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Providers are registered in auth.ts (Node.js only).
  // An empty array here still allows JWT-based session reads.
  providers: [],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    jwt: async ({ token, user, trigger, session }: {
      token: Record<string, unknown>;
      user?: { id?: string | null } | null;
      trigger?: string;
      session?: Record<string, unknown> | null;
    }) => {
      if (user) {
        token.uid = user.id;
        // activeAccountId is populated by auth.ts on first login (Node.js)
        // and already present in subsequent JWT reads
      }
      // activeAccountId on update is validated server-side in auth.ts (Node.js)
      // Do not write it here (edge runtime cannot query DB for membership).
      return token;
    },
    session: async ({ session, token }: {
      session: { user?: { id?: string; activeAccountId?: string; emailVerified?: boolean; locale?: string; plan?: string; trialEndsAt?: string; accountStatus?: string } } & Record<string, unknown>;
      token: Record<string, unknown>;
    }) => {
      if (session.user) {
        session.user.id = (token.uid as string) || '';
        session.user.activeAccountId = (token.activeAccountId as string) || '';
        session.user.emailVerified = (token.emailVerified as boolean) ?? false;
        session.user.locale = (token.locale as string) || 'en';
        session.user.plan = token.plan as string | undefined;
        session.user.trialEndsAt = token.trialEndsAt as string | undefined;
        session.user.accountStatus = token.accountStatus as string | undefined;
      }
      return session;
    },
  },
  // Only trust X-Forwarded-Host in development; in production set NEXTAUTH_URL explicitly.
  trustHost: process.env.NODE_ENV !== 'production',
} satisfies NextAuthConfig;

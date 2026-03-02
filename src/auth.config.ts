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
      if (trigger === 'update' && session?.activeAccountId) {
        token.activeAccountId = session.activeAccountId;
      }
      return token;
    },
    session: async ({ session, token }: {
      session: { user?: { id?: string; activeAccountId?: string } } & Record<string, unknown>;
      token: Record<string, unknown>;
    }) => {
      if (session.user) {
        session.user.id = (token.uid as string) || '';
        session.user.activeAccountId = (token.activeAccountId as string) || '';
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

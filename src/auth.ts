import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Account from '@/lib/models/Account';
import { seedAccountForNewUser } from '@/lib/seedWorkspace';
import { authConfig } from '@/auth.config';

// next-auth v5 beta type resolution doesn't fully align with bundler moduleResolution;
// the runtime call is correct, only the TS default-import signature is missing.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – next-auth default export callable mismatch with Next.js 16 bundler resolution
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }
        const bcrypt = await import('bcryptjs');
        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select('+passwordHash');
        if (!user) throw new Error('User not found');
        const passwordMatch = await bcrypt.default.compare(
          credentials.password as string,
          user.passwordHash || ''
        );
        if (!passwordMatch) throw new Error('Invalid password');
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Override jwt to also resolve activeAccountId from DB on first login
    jwt: async ({ token, user, trigger, session }: {
      token: Record<string, unknown>;
      user?: { id?: string | null } | null;
      trigger?: string;
      session?: Record<string, unknown> | null;
    }) => {
      // Apply base callback first (handles update trigger + uid)
      const base = await authConfig.callbacks.jwt({ token, user, trigger, session });

      // On first login: resolve activeAccountId from DB
      if (user?.id && !base.activeAccountId) {
        try {
          await connectDB();
          const dbUser = await User.findById(user.id);
          if (dbUser?.mainAccountId) {
            base.activeAccountId = dbUser.mainAccountId;
          } else {
            // Fall back to the first account the user is a member of
            const account = await Account.findOne(
              { 'members.userId': user.id },
              { _id: 1 }
            ).sort({ createdAt: 1 });
            if (account) {
              base.activeAccountId = account._id.toString();
            }
          }
        } catch (err) {
          console.error('[auth jwt] Failed to resolve activeAccountId', err);
        }
      }

      return base;
    },
  },
  events: {
    async createUser({ user }: { user: { id?: string | null; name?: string | null } }) {
      if (user.id && user.name) {
        await seedAccountForNewUser(user.id, user.name);
      }
    },
  },
});

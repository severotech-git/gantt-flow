import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { seedWorkspaceForNewUser } from '@/lib/seedWorkspace';

// next-auth v5 beta type resolution doesn't fully align with bundler moduleResolution;
// the runtime call is correct, only the TS default-import signature is missing.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error – next-auth default export callable mismatch with Next.js 16 bundler resolution
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
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

        // Dynamically import bcrypt only in Node.js runtime
        const bcrypt = await import('bcryptjs');

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select('+passwordHash');
        if (!user) {
          throw new Error('User not found');
        }

        const passwordMatch = await bcrypt.default.compare(
          credentials.password as string,
          user.passwordHash || ''
        );
        if (!passwordMatch) {
          throw new Error('Invalid password');
        }

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
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    jwt: async ({ token, user, trigger, session }: {
      token: Record<string, unknown>;
      user?: { id?: string | null } | null;
      trigger?: string;
      session?: Record<string, unknown> | null;
    }) => {
      if (user) {
        token.uid = user.id;
      }
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }
      return token;
    },
    session: async ({ session, token }: {
      session: { user?: { id?: string } } & Record<string, unknown>;
      token: Record<string, unknown>;
    }) => {
      if (session.user) {
        session.user.id = (token.uid as string) || '';
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: { user: { id?: string | null; name?: string | null } }) {
      if (user.id && user.name) {
        await seedWorkspaceForNewUser(user.id, user.name);
      }
    },
  },
  // Trust host in development (localhost) and when NEXTAUTH_URL is set
  trustHost: !!process.env.NEXTAUTH_URL || process.env.NODE_ENV !== 'production',
});

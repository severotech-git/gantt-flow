 
// @ts-expect-error – next-auth re-exports CredentialsSignin from @auth/core/errors; TS resolves it at runtime
import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Account from '@/lib/models/Account';
import EmailVerification from '@/lib/models/EmailVerification';
import EmailOTP from '@/lib/models/EmailOTP';
import TrustedDevice from '@/lib/models/TrustedDevice';
import { seedAccountForNewUser } from '@/lib/seedWorkspace';
import { authConfig } from '@/auth.config';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sendMFACode } from '@/lib/email';

/** Parse a single named cookie from a raw Cookie header string. */
function parseCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k.trim() === name) return v.join('=') || null;
  }
  return null;
}

class MFARequiredError extends CredentialsSignin {
  code = 'MFARequired';
}

// next-auth v5 beta type resolution doesn't fully align with bundler moduleResolution;
// the runtime call is correct, only the TS default-import signature is missing.
 
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
        mfaCode: { label: 'MFA Code', type: 'text' },
        bypassToken: { label: 'Bypass Token', type: 'text' },
      },
      async authorize(credentials, request) {
        // Rate limit per IP
        const ip = getClientIp((request as Request).headers);
        const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
        if (!rl.ok) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        if (!credentials?.email) {
          throw new Error('Invalid credentials');
        }

        const bcrypt = await import('bcryptjs');
        await connectDB();

        // ── Branch A: MFA code verification ──────────────────────────────────
        if (credentials.mfaCode) {
          const email = (credentials.email as string).toLowerCase();

          // Rate-limit MFA attempts per email
          const mfaRl = checkRateLimit(`mfa:${email}`, 5, 10 * 60 * 1000);
          if (!mfaRl.ok) {
            throw new Error('Too many code attempts. Please try again later.');
          }

          const otp = await EmailOTP.findOne({ email });
          if (!otp) return null;

          // Check expiry
          if (otp.expiresAt < new Date()) {
            await EmailOTP.deleteOne({ email });
            return null;
          }

          // Check attempt limit
          if (otp.attempts >= 5) return null;

          const codeMatch = await bcrypt.default.compare(
            credentials.mfaCode as string,
            otp.codeHash
          );

          if (!codeMatch) {
            await EmailOTP.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
            return null;
          }

          // Atomically claim the OTP document so two concurrent requests with
          // the correct code cannot both succeed (race-condition prevention).
          const claimed = await EmailOTP.findOneAndDelete({ _id: otp._id });
          if (!claimed) return null; // Another concurrent request claimed it first

          const user = await User.findOne({ email });
          if (!user) return null;

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        if (!credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const email = (credentials.email as string).toLowerCase();
        const user = await User.findOne({ email }).select('+passwordHash');
        // Return null (not throw) so NextAuth sets result.error = 'CredentialsSignin',
        // which the login page maps to a proper "Invalid email or password" message.
        if (!user) return null;

        const passwordMatch = await bcrypt.default.compare(
          credentials.password as string,
          user.passwordHash || ''
        );
        if (!passwordMatch) return null;

        // ── Branch B: bypassToken (post-registration auto-login) ──────────────
        // The client sends the sentinel '__use_cookie__'; the actual token lives
        // in an httpOnly cookie that is never readable by JavaScript.
        if (credentials.bypassToken === '__use_cookie__') {
          const cookieHeader = (request as Request).headers.get('cookie') ?? '';
          const bypassTokenValue = parseCookie(cookieHeader, '__bypass_token');

          if (bypassTokenValue) {
            // Per-userId rate limit so even a leaked httpOnly cookie can't be
            // brute-forced against multiple userIds.
            const bypassRl = checkRateLimit(`bypass:${user._id}`, 3, 60 * 1000);
            if (!bypassRl.ok) {
              throw new Error('Too many login attempts. Please try again later.');
            }

            const verification = await EmailVerification.findOne({
              userId: user._id.toString(),
              bypassToken: bypassTokenValue,
            });

            if (verification && verification.bypassExpiresAt && verification.bypassExpiresAt > new Date()) {
              // Single-use: clear bypassToken fields atomically
              await EmailVerification.findByIdAndUpdate(verification._id, {
                $unset: { bypassToken: '', bypassExpiresAt: '' },
              });
              return {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                image: user.image,
              };
            }
          }
          // Expired or missing bypass token — fall through to Branch C (MFA)
        }

        // ── Branch C: Normal login → check trusted device, then generate OTP ──

        // Skip MFA for unverified emails — middleware will redirect them to
        // /verify-email anyway, and MFA before verification is pointless.
        if (!user.emailVerified) {
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        const crypto = await import('crypto');

        // If a trusted-device cookie is present and valid, skip OTP entirely
        const cookieHeader2 = (request as Request).headers.get('cookie') ?? '';
        const trustCookie = parseCookie(cookieHeader2, '__mfa_trust');
        if (trustCookie) {
          const trustHash = crypto.createHash('sha256').update(trustCookie).digest('hex');
          const trusted = await TrustedDevice.findOne({
            userId: user._id.toString(),
            tokenHash: trustHash,
            expiresAt: { $gt: new Date() },
          });
          if (trusted) {
            return {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              image: user.image,
            };
          }
        }

        const code = String(crypto.randomInt(100000, 999999));
        const codeHash = await bcrypt.default.hash(code, 10);

        await EmailOTP.deleteOne({ email });
        await EmailOTP.create({
          email,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        try {
          await sendMFACode(email, code);
        } catch (err) {
          console.error('[auth] Failed to send MFA code:', err);
        }

        throw new MFARequiredError();
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account }: {
      user: { id?: string | null; email?: string | null; name?: string | null; image?: string | null };
      account: { provider?: string } | null;
    }) => {
      // Auto-verify OAuth users (Google handles its own email auth)
      if (account?.provider && account.provider !== 'credentials') {
        try {
          await connectDB();
          if (user?.email) {
            const email = user.email.toLowerCase();
            const existing = await User.findOne({ email });
            if (!existing) {
              // First OAuth login — create the user and seed their workspace
              const created = await User.create({
                email,
                name: user.name ?? email,
                image: user.image ?? undefined,
                emailVerified: new Date(),
              });
              await seedAccountForNewUser(created._id.toString(), created.name);
            } else {
              await User.findByIdAndUpdate(existing._id, { $set: { emailVerified: new Date() } });
            }
          }
        } catch (err) {
          console.error('[auth signIn] Failed to auto-verify OAuth user:', err);
        }
      }
      return true;
    },
    // Override jwt to also resolve activeAccountId and emailVerified from DB on first login
    jwt: async ({ token, user, trigger, session }: {
      token: Record<string, unknown>;
      user?: { id?: string | null; email?: string | null } | null;
      trigger?: string;
      session?: Record<string, unknown> | null;
    }) => {
      // Apply base callback first (handles uid on first login)
      const base = await authConfig.callbacks.jwt({ token, user, trigger, session });

      // Heal sessions where uid is an OAuth provider UUID instead of a MongoDB ObjectId.
      // Runs on every token refresh so existing sessions self-correct without re-login.
      const currentUid = (base.uid ?? '') as string;
      if (!/^[a-f\d]{24}$/i.test(currentUid) && token.email) {
        try {
          await connectDB();
          const healedUser = await User.findOne({ email: (token.email as string).toLowerCase() });
          if (healedUser) {
            base.uid = healedUser._id.toString();
            base.emailVerified = !!healedUser.emailVerified;
            base.locale = healedUser.locale ?? 'en';
            if (!base.activeAccountId) {
              const acct = await Account.findOne(
                { 'members.userId': healedUser._id.toString() },
                { _id: 1 }
              ).sort({ createdAt: 1 });
              if (acct) base.activeAccountId = acct._id.toString();
            }
          }
        } catch (err) {
          console.error('[auth jwt] Failed to heal OAuth uid:', err);
        }
      }

      // Always refresh billing fields from DB so subscribers don't see stale plan/status
      // after webhook updates without requiring re-login.
      if (!user && !trigger && base.activeAccountId) {
        try {
          await connectDB();
          const acct = await Account.findById(base.activeAccountId as string, { plan: 1, trialEndsAt: 1, status: 1 }).lean();
          if (acct) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const a = acct as any;
            base.plan = a.plan as string;
            base.trialEndsAt = (a.trialEndsAt as Date)?.toISOString();
            base.accountStatus = a.status as string;
          }
        } catch (err) {
          console.error('[auth jwt] Failed to refresh billing fields', err);
        }
      }

      // Self-heal: if the token says not verified but the DB has since verified, fix it.
      // Runs on every refresh for unverified users only — stops once emailVerified becomes true.
      if (!base.emailVerified && base.uid && !user) {
        try {
          await connectDB();
          const dbUser = await User.findById(base.uid as string, { emailVerified: 1 }).lean();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (dbUser && (dbUser as any).emailVerified) {
            base.emailVerified = true;
          }
        } catch (err) {
          console.error('[auth jwt] Failed to re-check emailVerified', err);
        }
      }

      // On update trigger: sync name from client session update
      if (trigger === 'update' && session?.name && typeof session.name === 'string') {
        base.name = session.name.trim();
      }

      // On update trigger: sync locale from client session update
      const VALID_LOCALES = ['en', 'pt-BR', 'es'];
      if (trigger === 'update' && session?.locale && VALID_LOCALES.includes(session.locale as string)) {
        base.locale = session.locale as string;
      }

      // On update trigger: validate membership before writing activeAccountId
      if (trigger === 'update' && session?.activeAccountId) {
        try {
          await connectDB();
          const uid = (base.uid ?? token.uid) as string;
          const acct = await Account.findOne(
            { _id: session.activeAccountId as string, 'members.userId': uid },
            { _id: 1, plan: 1, trialEndsAt: 1, status: 1 }
          ).lean();
          if (acct) {
            base.activeAccountId = session.activeAccountId;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const acctAny = acct as any;
            base.plan = acctAny.plan as string;
            base.trialEndsAt = (acctAny.trialEndsAt as Date)?.toISOString();
            base.accountStatus = acctAny.status as string;
          }
        } catch (err) {
          console.error('[auth jwt] Failed to validate activeAccountId membership', err);
        }
      }

      // On update trigger with emailVerified: re-validate from DB
      if (trigger === 'update' && session?.emailVerified === true) {
        try {
          await connectDB();
          const uid = (base.uid ?? token.uid) as string;
          const dbUser = await User.findById(uid);
          if (dbUser?.emailVerified) {
            base.emailVerified = true;
          }
        } catch (err) {
          console.error('[auth jwt] Failed to validate emailVerified:', err);
        }
      }

      // On first login: resolve activeAccountId, emailVerified, and locale from DB
      if (user?.id) {
        try {
          await connectDB();
          // OAuth providers supply a UUID as user.id, not a MongoDB ObjectId.
          // Fall back to email lookup so we always resolve the real DB user.
          const isObjectId = /^[a-f\d]{24}$/i.test(user.id);
          const dbUser = isObjectId
            ? await User.findById(user.id)
            : await User.findOne({ email: user.email?.toLowerCase() });
          if (dbUser) {
            base.uid = dbUser._id.toString(); // ensure JWT carries the real MongoDB _id
            base.emailVerified = !!dbUser.emailVerified;
            base.locale = dbUser.locale ?? 'en';
            const mongoId = dbUser._id.toString();
            let resolvedAccountId: string | undefined;
            if (dbUser.mainAccountId) {
              base.activeAccountId = dbUser.mainAccountId;
              resolvedAccountId = dbUser.mainAccountId;
            } else if (!base.activeAccountId) {
              // Fall back to the first account the user is a member of
              const account = await Account.findOne(
                { 'members.userId': mongoId },
                { _id: 1, plan: 1, trialEndsAt: 1, status: 1 }
              ).sort({ createdAt: 1 });
              if (account) {
                base.activeAccountId = account._id.toString();
                resolvedAccountId = account._id.toString();
                base.plan = account.plan;
                base.trialEndsAt = account.trialEndsAt?.toISOString();
                base.accountStatus = account.status;
              }
            }
            if (resolvedAccountId && !base.plan) {
              const acct = await Account.findById(resolvedAccountId, { plan: 1, trialEndsAt: 1, status: 1 }).lean();
              if (acct) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const acctAny = acct as any;
                base.plan = acctAny.plan as string;
                base.trialEndsAt = (acctAny.trialEndsAt as Date)?.toISOString();
                base.accountStatus = acctAny.status as string;
              }
            }
          }
        } catch (err) {
          console.error('[auth jwt] Failed to resolve user data', err);
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

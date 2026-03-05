import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth, requireManage } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();
    const [account, user] = await Promise.all([
      Account.findById(accountId, { settings: 1 }).lean(),
      User.findById(userId, { theme: 1, locale: 1, ganttScale: 1 }).lean(),
    ]);

    const u = user as { theme?: string; locale?: string; ganttScale?: string } | null;
    return NextResponse.json({
      ...(account?.settings ?? {}),
      theme: u?.theme ?? 'system',
      locale: u?.locale ?? 'en',
      ganttScale: u?.ganttScale ?? 'week',
    });
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Fields only owner/admin may change (account-level)
const MANAGED_FIELDS = ['levelNames', 'statuses', 'allowWeekends', 'users'] as const;

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const needsManage = MANAGED_FIELDS.some((k) => k in body);

    const authResult = needsManage
      ? await requireManage()
      : await requireAuth();

    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    const ops: Promise<unknown>[] = [];

    // theme → User document
    if ('theme' in body) {
      const VALID_THEMES = ['dark', 'light', 'system'] as const;
      if (!VALID_THEMES.includes(body.theme)) {
        return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
      }
      ops.push(User.findByIdAndUpdate(userId, { $set: { theme: body.theme } }, { runValidators: true }));
    }

    // ganttScale → User document
    if ('ganttScale' in body) {
      const VALID_SCALES = ['week', 'month', 'quarter'] as const;
      if (!VALID_SCALES.includes(body.ganttScale)) {
        return NextResponse.json({ error: 'Invalid ganttScale value' }, { status: 400 });
      }
      ops.push(User.findByIdAndUpdate(userId, { $set: { ganttScale: body.ganttScale } }, { runValidators: true }));
    }

    // locale → User document
    if ('locale' in body) {
      const VALID_LOCALES = ['en', 'pt-BR', 'es'] as const;
      if (!VALID_LOCALES.includes(body.locale)) {
        return NextResponse.json({ error: 'Invalid locale value' }, { status: 400 });
      }
      ops.push(User.findByIdAndUpdate(userId, { $set: { locale: body.locale } }, { runValidators: true }));
    }

    // account-level fields (owner/admin only)
    const $set: Record<string, unknown> = {};
    if (needsManage) {
      for (const key of MANAGED_FIELDS) {
        if (key in body) $set[`settings.${key}`] = body[key];
      }
    }
    if (Object.keys($set).length > 0) {
      ops.push(
        Account.findByIdAndUpdate(accountId, { $set }, { new: true, runValidators: true })
      );
    }

    await Promise.all(ops);

    // Return merged settings so the frontend state stays consistent
    const [account, user] = await Promise.all([
      Account.findById(accountId, { settings: 1 }).lean(),
      User.findById(userId, { theme: 1, locale: 1, ganttScale: 1 }).lean(),
    ]);

    const u2 = user as { theme?: string; locale?: string; ganttScale?: string } | null;
    const locale = u2?.locale ?? 'en';
    const res = NextResponse.json({
      ...(account?.settings ?? {}),
      theme: u2?.theme ?? 'system',
      locale,
      ganttScale: u2?.ganttScale ?? 'week',
    });

    // If locale changed, update NEXT_LOCALE cookie so next-intl picks it up immediately
    if ('locale' in body) {
      res.cookies.set('NEXT_LOCALE', locale, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
      });
    }

    return res;
  } catch (err) {
    console.error('[settings PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

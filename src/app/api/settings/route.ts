import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth, requireManage } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import User from '@/lib/models/User';
import type { NotificationChannel } from '@/types/index';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();
    const [account, user] = await Promise.all([
      Account.findById(accountId, { settings: 1, onboardingComplete: 1 }).lean(),
      User.findById(userId, { theme: 1, locale: 1, ganttScale: 1, notificationPreferences: 1 }).lean(),
    ]);

    const u = user as { theme?: string; locale?: string; ganttScale?: string; notificationPreferences?: Record<string, string> } | null;
    return NextResponse.json({
      ...(account?.settings ?? {}),
      onboardingComplete: account?.onboardingComplete ?? true,
      theme: u?.theme ?? 'system',
      locale: u?.locale ?? 'en',
      ganttScale: u?.ganttScale ?? 'week',
      notificationPreferences: u?.notificationPreferences ?? { itemsCreated: 'both', itemsOwned: 'both', mentions: 'both' },
    });
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // notificationPreferences → User document
    if ('notificationPreferences' in body) {
      const VALID_CHANNELS = new Set<NotificationChannel>(['in-app', 'email', 'both', 'off']);
      const prefs = body.notificationPreferences as Record<string, unknown>;
      const invalidPref = (['itemsCreated', 'itemsOwned', 'mentions'] as const).find(
        (key) => prefs[key] && (typeof prefs[key] !== 'string' || !VALID_CHANNELS.has(prefs[key] as NotificationChannel))
      );
      if (invalidPref) {
        return NextResponse.json({ error: `Invalid notification channel for ${invalidPref}` }, { status: 400 });
      }
      ops.push(User.findByIdAndUpdate(userId, { $set: { notificationPreferences: body.notificationPreferences } }, { runValidators: true }));
    }

    // account-level fields (owner/admin only)
    const $set: Record<string, unknown> = {};
    if (needsManage) {
      if ('levelNames' in body) {
        const { epic, feature, task } = body.levelNames as Record<string, string>;
        if (epic && typeof epic === 'string' && epic.trim().length > 100) {
          return NextResponse.json({ error: 'epic level name must be 100 characters or fewer' }, { status: 400 });
        }
        if (feature && typeof feature === 'string' && feature.trim().length > 100) {
          return NextResponse.json({ error: 'feature level name must be 100 characters or fewer' }, { status: 400 });
        }
        if (task && typeof task === 'string' && task.trim().length > 100) {
          return NextResponse.json({ error: 'task level name must be 100 characters or fewer' }, { status: 400 });
        }
        $set['settings.levelNames'] = body.levelNames;
      }
      if ('statuses' in body) {
        const statuses = body.statuses as Array<Record<string, unknown>>;
        if (Array.isArray(statuses)) {
          for (const s of statuses) {
            if (s.label && typeof s.label === 'string' && s.label.trim().length > 100) {
              return NextResponse.json({ error: 'status label must be 100 characters or fewer' }, { status: 400 });
            }
          }
        }
        $set['settings.statuses'] = body.statuses;
      }
      if ('users' in body) {
        const users = body.users as Array<Record<string, unknown>>;
        if (Array.isArray(users)) {
          for (const u of users) {
            if (u.name && typeof u.name === 'string' && u.name.trim().length > 100) {
              return NextResponse.json({ error: 'user name must be 100 characters or fewer' }, { status: 400 });
            }
          }
        }
        $set['settings.users'] = body.users;
      }
      if ('allowWeekends' in body) {
        $set['settings.allowWeekends'] = body.allowWeekends;
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
      Account.findById(accountId, { settings: 1, onboardingComplete: 1 }).lean(),
      User.findById(userId, { theme: 1, locale: 1, ganttScale: 1, notificationPreferences: 1 }).lean(),
    ]);

    const u2 = user as { theme?: string; locale?: string; ganttScale?: string; notificationPreferences?: Record<string, string> } | null;
    const locale = u2?.locale ?? 'en';
    const res = NextResponse.json({
      ...(account?.settings ?? {}),
      onboardingComplete: account?.onboardingComplete ?? true,
      theme: u2?.theme ?? 'system',
      locale,
      ganttScale: u2?.ganttScale ?? 'week',
      notificationPreferences: u2?.notificationPreferences ?? { itemsCreated: 'both', itemsOwned: 'both', mentions: 'both' },
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

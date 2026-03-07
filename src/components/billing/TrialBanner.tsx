'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { differenceInDays } from 'date-fns';

const BANNER_HEIGHT = '36px';

export function TrialBanner() {
  const t = useTranslations('billing');
  const { data: session } = useSession();
  const plan = session?.user?.plan;
  const trialEndsAt = session?.user?.trialEndsAt;
  const accountId = session?.user?.activeAccountId;

  const storageKey = `trial_banner_dismissed_${accountId}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === '1';
  });

  const daysLeft = trialEndsAt ? differenceInDays(new Date(trialEndsAt), new Date()) : -1;
  const visible = plan === 'trial' && !!trialEndsAt && !dismissed && daysLeft >= 0;

  // Expose banner height as a CSS variable so app pages can offset their layout.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--trial-banner-height',
      visible ? BANNER_HEIGHT : '0px'
    );
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  const message = daysLeft === 0
    ? t('trialBanner.lastDay')
    : t('trialBanner.message', { days: daysLeft });

  return (
    <div
      style={{ height: BANNER_HEIGHT }}
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-4 px-4 bg-violet-600 text-white text-xs shrink-0"
    >
      <span>{message}</span>
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/settings?section=billing" className="font-semibold underline underline-offset-2">
          {t('trialBanner.subscribeCta')}
        </Link>
        <button onClick={handleDismiss} aria-label={t('trialBanner.dismiss')}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

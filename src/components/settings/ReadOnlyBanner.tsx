'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ReadOnlyBanner() {
  const t = useTranslations('settings');
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
      <Lock size={12} className="shrink-0" />
      {t('readOnly')}
    </div>
  );
}

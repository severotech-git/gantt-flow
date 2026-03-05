'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslations } from 'next-intl';
import type { AppLocale } from '@/types';

const LOCALES: { value: AppLocale; flag: string; nativeName: string; englishName: string }[] = [
  { value: 'en',    flag: '🇺🇸', nativeName: 'English',    englishName: 'English' },
  { value: 'pt-BR', flag: '🇧🇷', nativeName: 'Português',  englishName: 'Portuguese (Brazil)' },
  { value: 'es',    flag: '🇪🇸', nativeName: 'Español',    englishName: 'Spanish' },
];

export function LanguageSection() {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const { locale, setLocale, persistSettings } = useSettingsStore();
  const t = useTranslations('settings.language');

  const handleLocaleChange = async (newLocale: AppLocale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);                  // update Zustand state
    await persistSettings('locale');       // PATCH → sets NEXT_LOCALE cookie
    await updateSession({ locale: newLocale });
    router.refresh();                      // re-render with new cookie in place
  };

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        {LOCALES.map((loc) => {
          const isActive = locale === loc.value;
          return (
            <button
              key={loc.value}
              onClick={() => handleLocaleChange(loc.value)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border hover:border-border/60 hover:bg-muted/40'
              }`}
            >
              <span className="text-2xl leading-none">{loc.flag}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-foreground'}`}>
                  {loc.nativeName}
                </p>
                <p className="text-xs text-muted-foreground">{loc.englishName}</p>
              </div>
              {isActive && (
                <Check size={16} className="text-blue-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Globe size={12} />
        {t('note')}
      </p>
    </div>
  );
}

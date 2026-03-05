'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';

const THEMES: { value: 'system' | 'dark' | 'light'; icon: React.ReactNode; previewDark: string; previewLight: string }[] = [
  {
    value: 'system',
    icon: <Monitor size={16} />,
    previewDark: 'bg-[#0d1117]',
    previewLight: 'bg-white',
  },
  {
    value: 'dark',
    icon: <Moon size={16} />,
    previewDark: 'bg-[#0d1117]',
    previewLight: 'bg-[#0d1117]',
  },
  {
    value: 'light',
    icon: <Sun size={16} />,
    previewDark: 'bg-white',
    previewLight: 'bg-white',
  },
];

export function ThemeSection() {
  const { theme, setTheme } = useSettingsStore();
  const t = useTranslations('settings.theme');

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex gap-4">
        {THEMES.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
              theme === themeOption.value
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-border hover:border-border/80 bg-muted/20'
            )}
          >
            {/* Mini preview */}
            {themeOption.value === 'system' ? (
              /* Split preview: dark left / light right */
              <div className="w-full h-16 rounded-md border border-border overflow-hidden flex">
                <div className="w-1/2 h-full bg-[#0d1117] flex">
                  <div className="w-4 h-full bg-[#161b22]" />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className="h-1 w-3/4 rounded-full bg-white/20" />
                    <div className="h-1 w-1/2 rounded-full bg-white/10" />
                    <div className="h-1 w-2/3 rounded-full bg-blue-500/40" />
                  </div>
                </div>
                <div className="w-1/2 h-full bg-white flex border-l border-border/30">
                  <div className="w-4 h-full bg-slate-100" />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className="h-1 w-3/4 rounded-full bg-slate-300" />
                    <div className="h-1 w-1/2 rounded-full bg-slate-200" />
                    <div className="h-1 w-2/3 rounded-full bg-blue-300" />
                  </div>
                </div>
              </div>
            ) : (
              <div className={cn('w-full h-16 rounded-md border border-border overflow-hidden', themeOption.previewDark)}>
                <div className="flex h-full">
                  <div className={cn('w-8 h-full', themeOption.value === 'dark' ? 'bg-[#161b22]' : 'bg-slate-100')} />
                  <div className="flex-1 p-2 space-y-1.5">
                    <div className={cn('h-1.5 w-3/4 rounded-full', themeOption.value === 'dark' ? 'bg-white/20' : 'bg-slate-300')} />
                    <div className={cn('h-1.5 w-1/2 rounded-full', themeOption.value === 'dark' ? 'bg-white/10' : 'bg-slate-200')} />
                    <div className={cn('h-1.5 w-2/3 rounded-full', themeOption.value === 'dark' ? 'bg-blue-500/40' : 'bg-blue-300')} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">{themeOption.icon}</span>
              {t(themeOption.value)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

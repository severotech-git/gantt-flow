'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { Moon, Sun, Monitor } from 'lucide-react';

const THEMES: { value: 'system' | 'dark' | 'light'; label: string; icon: React.ReactNode; previewDark: string; previewLight: string }[] = [
  {
    value: 'system',
    label: 'System',
    icon: <Monitor size={16} />,
    previewDark: 'bg-[#0d1117]',
    previewLight: 'bg-white',
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon size={16} />,
    previewDark: 'bg-[#0d1117]',
    previewLight: 'bg-[#0d1117]',
  },
  {
    value: 'light',
    label: 'Light',
    icon: <Sun size={16} />,
    previewDark: 'bg-white',
    previewLight: 'bg-white',
  },
];

export function ThemeSection() {
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Theme</h2>
        <p className="text-sm text-muted-foreground">Choose your preferred color scheme.</p>
      </div>

      <div className="flex gap-4">
        {THEMES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex-1 flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
              theme === t.value
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-border hover:border-border/80 bg-muted/20'
            )}
          >
            {/* Mini preview */}
            {t.value === 'system' ? (
              /* Split preview: dark left / light right */
              <div className="w-full h-16 rounded-md border border-border overflow-hidden flex">
                <div className="w-1/2 h-full bg-[#0d1117] flex">
                  <div className="w-4 h-full bg-[#161b22]" />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className="h-1 w-3/4 rounded-full bg-white/20" />
                    <div className="h-1 w-1/2 rounded-full bg-white/10" />
                    <div className="h-1 w-2/3 rounded-full bg-violet-500/40" />
                  </div>
                </div>
                <div className="w-1/2 h-full bg-white flex border-l border-border/30">
                  <div className="w-4 h-full bg-slate-100" />
                  <div className="flex-1 p-1.5 space-y-1">
                    <div className="h-1 w-3/4 rounded-full bg-slate-300" />
                    <div className="h-1 w-1/2 rounded-full bg-slate-200" />
                    <div className="h-1 w-2/3 rounded-full bg-violet-300" />
                  </div>
                </div>
              </div>
            ) : (
              <div className={cn('w-full h-16 rounded-md border border-border overflow-hidden', t.previewDark)}>
                <div className="flex h-full">
                  <div className={cn('w-8 h-full', t.value === 'dark' ? 'bg-[#161b22]' : 'bg-slate-100')} />
                  <div className="flex-1 p-2 space-y-1.5">
                    <div className={cn('h-1.5 w-3/4 rounded-full', t.value === 'dark' ? 'bg-white/20' : 'bg-slate-300')} />
                    <div className={cn('h-1.5 w-1/2 rounded-full', t.value === 'dark' ? 'bg-white/10' : 'bg-slate-200')} />
                    <div className={cn('h-1.5 w-2/3 rounded-full', t.value === 'dark' ? 'bg-violet-500/40' : 'bg-violet-300')} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">{t.icon}</span>
              {t.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

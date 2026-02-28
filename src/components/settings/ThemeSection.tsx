'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';

const THEMES: { value: 'dark' | 'light'; label: string; icon: React.ReactNode; preview: string }[] = [
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon size={16} />,
    preview: 'bg-[#0d1117]',
  },
  {
    value: 'light',
    label: 'Light',
    icon: <Sun size={16} />,
    preview: 'bg-white',
  },
];

export function ThemeSection() {
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Theme</h2>
        <p className="text-sm text-slate-400">Choose your preferred color scheme.</p>
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
                : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
            )}
          >
            {/* Mini preview */}
            <div className={cn('w-full h-16 rounded-md border border-white/10 overflow-hidden', t.preview)}>
              <div className="flex h-full">
                <div className={cn('w-8 h-full', t.value === 'dark' ? 'bg-[#161b22]' : 'bg-slate-100')} />
                <div className="flex-1 p-2 space-y-1.5">
                  <div className={cn('h-1.5 w-3/4 rounded-full', t.value === 'dark' ? 'bg-white/20' : 'bg-slate-300')} />
                  <div className={cn('h-1.5 w-1/2 rounded-full', t.value === 'dark' ? 'bg-white/10' : 'bg-slate-200')} />
                  <div className={cn('h-1.5 w-2/3 rounded-full', t.value === 'dark' ? 'bg-violet-500/40' : 'bg-violet-300')} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <span className="text-slate-400">{t.icon}</span>
              {t.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

function applyTheme(resolved: 'dark' | 'light') {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}

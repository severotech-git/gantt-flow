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

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const resolved = mq.matches ? 'dark' : 'light';
      applyTheme(resolved);
      localStorage.setItem('ganttflow-theme', resolved);
      const handler = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('ganttflow-theme', newTheme);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    applyTheme(theme);
    localStorage.setItem('ganttflow-theme', theme);
  }, [theme]);

  return <>{children}</>;
}

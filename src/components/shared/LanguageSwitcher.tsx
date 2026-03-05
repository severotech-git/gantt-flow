'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AppLocale } from '@/types';
import { cn } from '@/lib/utils';

const LOCALES: { value: AppLocale; label: string; short: string }[] = [
  { value: 'en',    label: 'English',   short: 'EN' },
  { value: 'pt-BR', label: 'Português', short: 'PT' },
  { value: 'es',    label: 'Español',   short: 'ES' },
];

interface LanguageSwitcherProps {
  /** 'dropdown' shows a Globe+code trigger with a dropdown menu (default).
   *  'pills'   shows three inline buttons. */
  variant?: 'dropdown' | 'pills';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dropdown', className }: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);

  useEffect(() => {
    if (!pendingLocale) return;
    document.cookie = `NEXT_LOCALE=${pendingLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }, [pendingLocale, router]);

  const handleChange = (newLocale: AppLocale) => {
    if (newLocale === locale) return;
    setPendingLocale(newLocale);
  };

  if (variant === 'pills') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {LOCALES.map((loc, idx) => (
          <span key={loc.value} className="flex items-center">
            <button
              onClick={() => handleChange(loc.value)}
              className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded transition-colors',
                locale === loc.value
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {loc.short}
            </button>
            {idx < LOCALES.length - 1 && (
              <span className="text-muted-foreground/30 text-xs select-none">·</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  const current = LOCALES.find((l) => l.value === locale) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1.5 hover:bg-accent',
            className
          )}
        >
          <Globe size={13} />
          <span className="font-medium">{current.short}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.value}
            onSelect={() => handleChange(loc.value)}
            className={cn(
              'text-xs cursor-pointer gap-2',
              locale === loc.value && 'font-semibold text-foreground'
            )}
          >
            <span className="w-4 text-[10px] text-muted-foreground font-mono">{loc.short}</span>
            {loc.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'pt-BR', 'es'] as const,
  defaultLocale: 'en',
  localePrefix: 'never', // cookie-based, no URL segments
});

export type AppLocale = (typeof routing.locales)[number];

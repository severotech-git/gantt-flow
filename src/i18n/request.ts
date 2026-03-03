import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { routing, AppLocale } from './routing';

const LOCALES = routing.locales as readonly AppLocale[];

function resolveLocale(raw: string | undefined): AppLocale | null {
  if (!raw) return null;
  // Exact match first
  if ((LOCALES as readonly string[]).includes(raw)) return raw as AppLocale;
  // Prefix match: "pt" → "pt-BR", "es-MX" → "es"
  const prefix = raw.split('-')[0].toLowerCase();
  const found = LOCALES.find(
    (l) => l.toLowerCase() === prefix || l.toLowerCase().startsWith(prefix + '-')
  );
  return found ?? null;
}

export default getRequestConfig(async () => {
  // 1. Saved cookie (set by settings PATCH or register)
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;

  // 2. Accept-Language header (used when no cookie is set)
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  const fromHeader = acceptLanguage?.split(',')[0]?.split(';')[0]?.trim();

  const locale: AppLocale =
    resolveLocale(fromCookie) ??
    resolveLocale(fromHeader) ??
    routing.defaultLocale;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (await import(`../../messages/${locale}.json`)) as { default: Record<string, any> };

  return {
    locale,
    messages: messages.default,
  };
});

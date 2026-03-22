import type { AppLocale } from '@/i18n/routing';

const messageCache: Partial<Record<AppLocale, Record<string, unknown>>> = {};

const DEFAULT_LOCALE: AppLocale = 'en';
const VALID_LOCALES: readonly string[] = ['en', 'pt-BR', 'es'];

async function loadMessages(
  locale: AppLocale
): Promise<Record<string, unknown>> {
  if (messageCache[locale]) return messageCache[locale]!;
  const mod = await import(`../../messages/${locale}.json`);
  const messages = mod.default as Record<string, unknown>;
  messageCache[locale] = messages;
  return messages;
}

function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export function resolveEmailLocale(locale?: string | null): AppLocale {
  if (locale && VALID_LOCALES.includes(locale)) return locale as AppLocale;
  return DEFAULT_LOCALE;
}

export async function getEmailText(
  locale: AppLocale,
  key: string,
  params: Record<string, string | number> = {}
): Promise<string> {
  const messages = await loadMessages(locale);
  let text = getNestedValue(messages, key);

  if (text === undefined && locale !== DEFAULT_LOCALE) {
    const fallbackMessages = await loadMessages(DEFAULT_LOCALE);
    text = getNestedValue(fallbackMessages, key);
  }

  if (text === undefined) {
    console.warn(`[emailTranslations] Missing key: ${key} for locale: ${locale}`);
    return key;
  }

  return interpolate(text, params);
}

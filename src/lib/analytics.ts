declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

export function trackConversion() {
  const id = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID;
  const label = process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL;
  if (!id || !label) return;
  trackEvent('conversion', { send_to: `${id}/${label}` });
}

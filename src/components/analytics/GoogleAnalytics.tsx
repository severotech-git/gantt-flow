'use client';

import Script from 'next/script';

export function GoogleAnalytics() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const gadsId = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID;

  const primaryId = gadsId || gaMeasurementId;
  if (!primaryId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${gadsId ? `gtag('config', '${gadsId}');` : ''}
          ${gaMeasurementId ? `gtag('config', '${gaMeasurementId}');` : ''}
        `}
      </Script>
    </>
  );
}

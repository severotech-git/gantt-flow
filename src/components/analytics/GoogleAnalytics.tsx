'use client';

import Script from 'next/script';

export function GoogleAnalytics() {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!gaMeasurementId) return null;

  const gadsId = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaMeasurementId}');
          ${gadsId ? `gtag('config', '${gadsId}');` : ''}
        `}
      </Script>
    </>
  );
}

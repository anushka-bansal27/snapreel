'use client';
import Script from 'next/script';

export function AnalyticsTracker({ gaId }: { gaId?: string }) {
  const measurementId = gaId?.trim().toUpperCase();
  const isValidId = !!measurementId && /^G-[A-Z0-9]+$/.test(measurementId);

  if (!isValidId || !measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}

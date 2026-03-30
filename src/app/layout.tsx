import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AccountProvider } from '@/components/providers/AccountProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'GanttFlow – Project Roadmap',
  description: 'Plan, track, and visualize your projects with interactive Gantt charts.',
  openGraph: {
    title: 'GanttFlow – Project Roadmap',
    description: 'Plan, track, and visualize your projects with interactive Gantt charts.',
    siteName: 'GanttFlow',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/logo.png',
        alt: 'GanttFlow Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'GanttFlow – Project Roadmap',
    description: 'Plan, track, and visualize your projects with interactive Gantt charts.',
    images: ['/logo.png'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){const s=localStorage.getItem('ganttflow-theme');const d=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.add(s==='light'||s==='dark'?s:d);})();`,
          }}
        />
      </head>
      <GoogleAnalytics />
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <ThemeProvider>
              <AccountProvider>
                <TooltipProvider delayDuration={300}>
                  <TrialBanner />
                  {children}
                </TooltipProvider>
              </AccountProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

function VerifyEmailContent() {
  const t = useTranslations('auth.verifyEmail');
  const { data: session, update, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === '1';

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // When arriving with ?success=1, update the session so JWT picks up emailVerified
  useEffect(() => {
    if (success && !refreshing) {
      setRefreshing(true);
      update({ emailVerified: true }).then(() => {
        router.replace('/projects');
      });
    }
  }, [success, update, router, refreshing]);

  // If already verified (e.g. navigated here manually), redirect to projects
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.emailVerified && !success) {
      router.replace('/projects');
    }
  }, [status, session, success, router]);

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await fetch('/api/auth/verify-email/resend', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(t('resendSuccess'));
      } else {
        setResendMessage(data.error ?? t('resendFailed'));
      }
    } catch {
      setResendMessage(t('errorOccurred'));
    } finally {
      setResendLoading(false);
    }
  };

  if (success || refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <p className="text-lg font-medium text-foreground">{t('verifiedRedirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg text-center">
        <div className="flex justify-end items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <Mail className="mx-auto h-12 w-12 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.rich('body', {
              email: () => (
                <span className="font-medium text-foreground">
                  {session?.user?.email ?? t('emailFallback')}
                </span>
              ),
            })}
          </p>
        </div>

        {resendMessage && (
          <p className={`text-sm ${resendMessage === t('resendSuccess') ? 'text-green-600' : 'text-red-600'}`}>
            {resendMessage}
          </p>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={resendLoading}
        >
          {resendLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('resending')}
            </>
          ) : (
            t('resendButton')
          )}
        </Button>

        <p className="text-xs text-muted-foreground">{t('rateLimited')}</p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

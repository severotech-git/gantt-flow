'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../../public/icon.png';

const AUTH_ERROR_KEYS: Record<string, string> = {
  CredentialsSignin: 'CredentialsSignin',
  MFARequired: 'MFARequired',
  OAuthSignin: 'OAuthSignin',
  OAuthCallback: 'OAuthCallback',
  OAuthCreateAccount: 'OAuthCreateAccount',
  EmailCreateAccount: 'EmailCreateAccount',
  Callback: 'Callback',
  OAuthAccountNotLinked: 'OAuthAccountNotLinked',
  SessionRequired: 'SessionRequired',
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth.login');
  const raw = searchParams.get('callbackUrl') || '/projects';
  const callbackUrl = raw.startsWith('/') ? raw : '/projects';
  const errorParam = searchParams.get('error');

  const friendlyAuthError = useCallback((code: string | null | undefined): string => {
    if (!code) return '';
    const key = AUTH_ERROR_KEYS[code] ?? 'Default';
    return t(`errors.${key}` as Parameters<typeof t>[0]);
  }, [t]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const resetSuccess = searchParams.get('reset') === '1';

  useEffect(() => {
    if (errorParam) setError(friendlyAuthError(errorParam));
  }, [errorParam, friendlyAuthError]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/projects');
    }
  }, [status, session, router]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.code === 'MFARequired') {
        sessionStorage.setItem('mfa_pending_email', email);
        router.push(`/verify-mfa?email=${encodeURIComponent(email)}`);
      } else if (result?.error) {
        setError(friendlyAuthError(result.error));
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError(friendlyAuthError('Default'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image
              src={logoIcon}
              alt="GanttFlow Logo"
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="flex flex-col leading-tight">
              <span>GanttFlow</span>
              <span className="text-2xs font-normal text-muted-foreground">by SeveroTech</span>
            </span>
          </h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {resetSuccess && (
          <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded text-sm">
            {t('resetSuccess')}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('emailLabel')}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              maxLength={254}
              disabled={loading}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground">
                {t('passwordLabel')}
              </label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              maxLength={128}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('signingIn') : t('signInButton')}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">{t('orContinueWith')}</span>
          </div>
        </div>

        <GoogleSignInButton
          label={t('google')}
          callbackUrl={callbackUrl}
          disabled={loading}
        />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{t('noAccount')} </span>
          <Link href="/register" className="text-primary hover:underline font-medium">
            {t('createOne')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

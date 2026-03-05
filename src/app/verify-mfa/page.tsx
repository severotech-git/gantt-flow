'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import logoIcon from '../../../public/icon.png';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

function VerifyMFAContent() {
  const t = useTranslations('auth.verifyMfa');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Email can come from query param (login flow) or sessionStorage (MFA redirect).
  // Validate the format before use to prevent session-fixation via crafted values.
  const emailFromParam = searchParams.get('email') ?? '';
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const [email] = useState(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_pending_email') ?? '' : '';
    const candidate = emailFromParam || stored;
    return isValidEmail(candidate) ? candidate : '';
  });

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError(t('invalidCode')); return; }
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        mfaCode: code,
        redirect: false,
      });

      if (result?.ok) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('mfa_pending_email');
        }
        router.push('/projects');
      } else {
        setCode('');
        setError(t('invalidOrExpired'));
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image src={logoIcon} alt="GanttFlow Logo" height={32} className="h-8 w-auto object-contain" priority />
            GanttFlow
          </h1>
          <LanguageSwitcher />
        </div>

        <div className="text-center">
          <ShieldCheck className="mx-auto mt-2 h-10 w-10 text-primary" />
          <h2 className="mt-2 text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.rich('body', {
              email: () => (
                <span className="font-medium text-foreground">{email || t('emailFallback')}</span>
              ),
            })}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder={t('codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white" disabled={loading || code.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('verify')
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {t('noCode')}{' '}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => router.push('/login')}
          >
            {t('goBack')}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function VerifyMFAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyMFAContent />
    </Suspense>
  );
}

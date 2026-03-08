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
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const RESEND_COOLDOWN = 120;

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
  const [trustDevice, setTrustDevice] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resend state — starts locked because a code was already sent on page load
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Start the initial 120s cooldown on mount (code was sent when user arrived)
  useEffect(() => {
    startCooldown(RESEND_COOLDOWN);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
   
  }, []);

  function startCooldown(seconds: number) {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

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

      // next-auth beta.30: result.ok reflects HTTP status (always 200), not auth success.
      // The only reliable success indicator is the absence of result.error.
      const errCode = result?.error ?? '';
      if (!errCode) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('mfa_pending_email');
        }
        if (trustDevice) {
          // Fire-and-forget — don't block redirect on failure
          fetch('/api/auth/mfa/trust', { method: 'POST', credentials: 'include' }).catch(() => {});
        }
        router.push('/projects');
      } else {
        setCode('');
        if (errCode === 'CredentialsSignin') {
          setError(t('invalidOrExpired'));
        } else if (errCode === 'TooManyAttempts' || errCode === 'Configuration') {
          setError(t('tooManyAttempts'));
        } else {
          setError(t('unexpectedError'));
        }
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendError('');
    setResendSuccess(false);
    setResendLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        const data = await res.json();
        const wait = typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : RESEND_COOLDOWN;
        startCooldown(wait);
      } else if (res.ok) {
        setResendSuccess(true);
        startCooldown(RESEND_COOLDOWN);
      } else {
        setResendError(t('resendFailed'));
      }
    } catch {
      setResendError(t('resendFailed'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Image src={logoIcon} alt="GanttFlow Logo" height={32} className="h-8 w-auto object-contain" priority />
            <span className="flex flex-col leading-tight">
              <span>GanttFlow</span>
              <span className="text-[10px] font-normal text-muted-foreground">by SeveroTech</span>
            </span>
          </h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
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
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {t('trustDevice')}
          </label>
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
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

        <div className="space-y-2">
          {resendSuccess && (
            <p className="text-center text-sm text-green-600">{t('resendSuccess')}</p>
          )}
          {resendError && (
            <p className="text-center text-sm text-red-600">{resendError}</p>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendCooldown > 0 || resendLoading}
            onClick={handleResend}
          >
            {resendLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('resendingCode')}
              </>
            ) : resendCooldown > 0 ? (
              t('resendCooldown', { seconds: resendCooldown })
            ) : (
              t('resendCode')
            )}
          </Button>

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

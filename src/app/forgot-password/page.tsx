'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { CheckCircle } from 'lucide-react';

import logoIcon from '../../../public/icon.png';

function ForgotPasswordContent() {
  const t = useTranslations('auth.forgotPassword');
  const tErr = useTranslations('apiErrors');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.code ? tErr(data.code as never) : tErr('GENERIC'));
      }
    } catch {
      setError(tErr('GENERIC'));
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
            GanttFlow
          </h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">{t('successTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('successDescription')}</p>
            <Link href="/login" className="block text-sm text-primary hover:underline font-medium">
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('emailLabel')}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '...' : t('submitButton')}
              </Button>
            </form>

            <div className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t('backToLogin')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { GoogleSignInButton } from '@/components/shared/GoogleSignInButton';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../../public/icon.png';
import { PASSWORD_RULES, validatePassword } from '@/lib/passwordPolicy';
import { Check, X } from 'lucide-react';

function RegisterPageContent() {
  const t = useTranslations('auth.register');
  const tErr = useTranslations('apiErrors');
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');
  const currentLocale = useLocale();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(formData.password);
    if (pwError) { setError(pwError); return; }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, locale: currentLocale }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.code ? tErr(data.code as never) : tErr('GENERIC'));
        return;
      }

      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        bypassToken: '__use_cookie__',
        redirect: false,
      });

      if (signInResult?.ok) {
        if (inviteToken) {
          router.push(`/invite/${inviteToken}?auto=1`);
        } else {
          router.push('/projects');
        }
      } else {
        setError(t('autoLoginFailed'));
      }
    } catch (err) {
      setError(t('unexpectedError'));
      console.error(err);
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
              <span className="text-[10px] font-normal text-muted-foreground">by SeveroTech</span>
            </span>
          </h1>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('heading')}</h2>
          {inviteToken && (
            <p className="text-sm text-muted-foreground mt-1">{t('inviteSubtitle')}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('nameLabel')}
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('namePlaceholder')}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('emailLabel')}
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('emailPlaceholder')}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('passwordLabel')}
            </label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setPasswordFocused(true)}
              placeholder={t('passwordPlaceholder')}
              disabled={loading}
              required
            />
            {(passwordFocused || formData.password.length > 0) && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(formData.password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {passed ? <Check size={11} /> : <X size={11} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('confirmPasswordLabel')}
            </label>
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('confirmPasswordPlaceholder')}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? t('creating') : inviteToken ? t('createAndAcceptButton') : t('createButton')}
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
          callbackUrl={inviteToken ? `/invite/${inviteToken}?auto=1` : '/projects'}
          disabled={loading}
        />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{t('alreadyHaveAccount')} </span>
          <Link
            href={inviteToken ? `/login?callbackUrl=${encodeURIComponent(`/invite/${inviteToken}`)}` : '/login'}
            className="text-primary hover:underline font-medium"
          >
            {t('signIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

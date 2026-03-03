'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslations } from 'next-intl';
import type { AppLocale } from '@/types';

const LOCALES: { value: AppLocale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pt-BR', label: 'Português' },
  { value: 'es', label: 'Español' },
];

export function ProfileSection() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const { locale, setLocale } = useSettingsStore();
  const t = useTranslations('settings.profile');
  const [name, setName] = useState(session?.user?.name || '');
  const [email] = useState(session?.user?.email || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleLocaleChange = async (newLocale: AppLocale) => {
    setLocale(newLocale);
    await updateSession({ locale: newLocale });
    router.refresh();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update next-auth session
      await updateSession({ name });

      setStatus('success');
      setMessage('Profile updated successfully');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      // loading state already reset by setStatus above
    }
  };

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
        <OwnerAvatar name={name || session?.user?.name || 'User'} size={64} />
        <div>
          <p className="text-sm font-medium text-foreground">{name || session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            {t('displayNameLabel')}
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={status === 'loading'}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('emailLabel')}
          </label>
          <Input
            id="email"
            value={email}
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">
            {t('emailNote')}
          </p>
        </div>

        {message && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message}
          </div>
        )}

        <Button
          type="submit"
          disabled={status === 'loading' || name === session?.user?.name}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {status === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              {t('saving')}
            </>
          ) : (
            t('saveButton')
          )}
        </Button>
      </form>

      {/* Language picker */}
      <div className="space-y-4 pt-2 border-t border-border">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">{t('languageTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('languageSubtitle')}</p>
        </div>
        <div className="flex gap-3">
          {LOCALES.map((loc) => (
            <button
              key={loc.value}
              onClick={() => handleLocaleChange(loc.value)}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                locale === loc.value
                  ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                  : 'border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

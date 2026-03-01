'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function ProfileSection() {
  const { data: session, update: updateSession } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [email] = useState(session?.user?.email || '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
        <h2 className="text-lg font-semibold text-foreground mb-1">Personal Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account information and how you appear to others.
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
            Display Name
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
            Email Address
          </label>
          <Input
            id="email"
            value={email}
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">
            Email cannot be changed. Contact support if you need to update it.
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
              Saving changes...
            </>
          ) : (
            'Save Profile'
          )}
        </Button>
      </form>
    </div>
  );
}

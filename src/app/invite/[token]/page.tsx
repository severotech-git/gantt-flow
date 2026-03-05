'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { IInvitation } from '@/types';
import { Loader2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const { data: session, status: authStatus, update } = useSession();
  const router = useRouter();

  const [invitation, setInvitation] = useState<IInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Invitation not found or expired');
        } else {
          const data = await res.json();
          setInvitation(data);
        }
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-accept if user is authenticated and this page loaded post-registration
  useEffect(() => {
    const autoAccept = new URLSearchParams(window.location.search).get('auto') === '1';
    if (autoAccept && authStatus === 'authenticated' && invitation && !done) {
      handleAccept();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, invitation]);

  const handleAccept = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to accept');
      setDone(true);
      // Switch to the newly joined account
      await update({ activeAccountId: data.accountId });
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/invitations/${token}/reject`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to decline');
      }
      setDone(true);
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4">
          <p className="text-lg font-semibold text-foreground">Invitation unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline"><Link href="/projects">Go to app</Link></Button>
        </div>
      </div>
    );
  }

  const expiry = invitation ? formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true }) : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-border rounded-lg shadow-lg">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users size={22} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">You&apos;re invited!</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{invitation?.inviterName}</span> invited you to join{' '}
            <span className="font-medium text-foreground">{invitation?.accountName}</span> on GanttFlow.
          </p>
          <p className="text-xs text-muted-foreground">Expires {expiry}</p>
        </div>

        {authStatus === 'unauthenticated' ? (
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/register?inviteToken=${token}`}>Accept &amp; Sign Up</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>
                Already have an account? Sign In
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <p className="text-xs text-center text-muted-foreground">
              Signed in as <span className="text-foreground">{session?.user?.email}</span>
            </p>
            <Button className="w-full" disabled={acting || done} onClick={handleAccept}>
              {acting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Accept Invitation
            </Button>
            <Button variant="outline" className="w-full" disabled={acting || done} onClick={handleReject}>
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

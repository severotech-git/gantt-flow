'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import { PlanCard } from '@/components/billing/PlanCard';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Clock, LogOut, ChevronRight, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full bg-violet-600/20 text-violet-400 font-semibold text-sm', className)}>
      {initials}
    </span>
  );
}

export function Paywall() {
  const t = useTranslations('billing');
  const { data: session, update } = useSession();
  const router = useRouter();
  const plans = useAccountStore((s) => s.plans);
  const fetchPlans = useAccountStore((s) => s.fetchPlans);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const accounts = useAccountStore((s) => s.accounts);
  const members = useAccountStore((s) => s.members);
  const fetchMembers = useAccountStore((s) => s.fetchMembers);
  const createCheckout = useAccountStore((s) => s.createCheckout);
  const switchAccount = useAccountStore((s) => s.switchAccount);

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const activeAccountId = session?.user?.activeAccountId;
  const currentUserId = session?.user?.id;
  const currentAccount = accounts.find((a) => a._id === activeAccountId);
  const isOwner = currentAccount?.members?.find((m) => m.userId === currentUserId)?.role === 'owner';
  const otherAccounts = accounts.filter((a) => a._id !== activeAccountId);

  // Resolve owner name: prefer enriched members (have user.name), fall back to settings.users
  const ownerMemberId = currentAccount?.members?.find((m) => m.role === 'owner')?.userId;
  const ownerEnriched = members.find((m) => m.userId === ownerMemberId);
  const ownerSettingsUser = currentAccount?.settings?.users?.find((u) => u.uid === ownerMemberId);
  const ownerName = ownerEnriched?.user?.name ?? ownerSettingsUser?.name ?? null;
  const ownerEmail = ownerEnriched?.user?.email ?? null;

  useEffect(() => {
    fetchPlans();
    fetchAccounts();
  }, [fetchPlans, fetchAccounts]);

  useEffect(() => {
    if (activeAccountId) fetchMembers(activeAccountId);
  }, [activeAccountId, fetchMembers]);

  // Make the page behind the overlay inert so hiding the overlay CSS
  // via devtools still does not restore keyboard or pointer access.
  useEffect(() => {
    const behind = document.getElementById('paywall-behind');
    if (behind) behind.setAttribute('inert', '');
    return () => {
      if (behind) behind.removeAttribute('inert');
    };
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setIsLoading(priceId);
    try {
      const url = await createCheckout(priceId);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setIsLoading(null);
    }
  };

  const handleSwitch = async (accountId: string) => {
    setSwitchingId(accountId);
    try {
      await switchAccount(accountId);
      await update({ activeAccountId: accountId });
      router.push('/projects');
      router.refresh();
    } catch (err) {
      console.error(err);
      setSwitchingId(null);
    }
  };

  const handleLogout = () => signOut({ callbackUrl: '/login' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

        {isOwner ? (
          /* ── Owner view ─────────────────────────────────────────── */
          <div className="p-8">
            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock size={20} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold">{t('paywall.trialExpired')}</h2>
              <p className="text-sm text-muted-foreground text-center">{t('paywall.subscribeToAccess')}</p>
            </div>

            {plans.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan._id}
                    plan={plan}
                    isLoading={isLoading === plan.stripePriceId}
                    onSubscribe={handleSubscribe}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Non-owner view ──────────────────────────────────────── */
          <div>
            {/* Top gradient band */}
            <div className="bg-gradient-to-br from-violet-600/10 via-transparent to-transparent px-8 pt-8 pb-6 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock size={22} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('paywall.trialExpired')}</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {t('paywall.nonOwnerSubtitle', { workspace: currentAccount?.name ?? 'this workspace' })}
                </p>
              </div>
            </div>

            {/* Owner card */}
            <div className="px-8 pb-6">
              <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center gap-4">
                {ownerName ? (
                  <InitialsAvatar name={ownerName} className="w-10 h-10 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('paywall.workspaceOwner')}</p>
                  <p className="text-sm font-semibold truncate">{ownerName ?? t('paywall.ownerUnknown')}</p>
                  {ownerEmail && (
                    <p className="text-xs text-muted-foreground truncate">{ownerEmail}</p>
                  )}
                </div>
                {ownerEmail && (
                  <a
                    href={`mailto:${ownerEmail}?subject=GanttFlow subscription`}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Mail size={13} />
                    {t('paywall.contactCta')}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Switch workspace ─────────────────────────────────────── */}
        {otherAccounts.length > 0 && (
          <div className="border-t border-border px-8 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {t('paywall.switchAccount')}
            </p>
            <div className="flex flex-col gap-0.5">
              {otherAccounts.map((acc) => (
                <button
                  key={acc._id}
                  onClick={() => handleSwitch(acc._id)}
                  disabled={switchingId === acc._id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted text-xs font-bold">
                      {acc.name[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium">{acc.name}</span>
                  </div>
                  {switchingId === acc._id
                    ? <Loader2 size={13} className="animate-spin text-muted-foreground" />
                    : <ChevronRight size={14} className="text-muted-foreground" />
                  }
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="border-t border-border px-8 py-4 flex items-center justify-between bg-muted/20">
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {session?.user?.email}
          </p>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-1.5 shrink-0">
            <LogOut size={13} />
            {t('paywall.logout')}
          </Button>
        </div>

      </div>
    </div>
  );
}

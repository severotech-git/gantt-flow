'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAccountStore } from '@/store/useAccountStore';
import { LandingPricing } from '@/components/billing/LandingPricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/15 text-success-foreground',
  past_due: 'bg-warning/15 text-warning-foreground',
  canceled: 'bg-zinc-500/15 text-zinc-500',
  suspended: 'bg-destructive/15 text-destructive',
  trial: 'bg-violet-500/15 text-violet-600',
};

export function BillingSection() {
  const t = useTranslations('billing');
  const { data: session } = useSession();
  const subscription = useAccountStore((s) => s.subscription);
  const fetchSubscription = useAccountStore((s) => s.fetchSubscription);
  const createPortalSession = useAccountStore((s) => s.createPortalSession);
  const accounts = useAccountStore((s) => s.accounts);

  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const activeAccountId = session?.user?.activeAccountId;
  const currentAccount = accounts.find((a) => a._id === activeAccountId);
  const currentUserId = session?.user?.id;
  const isOwner = currentAccount?.members?.find((m) => m.userId === currentUserId)?.role === 'owner';

  const plan = session?.user?.plan ?? 'trial';
  const trialEndsAt = session?.user?.trialEndsAt;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setPortalLoading(false);
    }
  };

  const statusKey = subscription?.status ?? (plan === 'trial' ? 'trial' : 'active');

  return (
    <div className="space-y-8">
      {/* Current subscription status */}
      <div className="max-w-2xl">
        <h3 className="text-sm font-semibold mb-4">{t('subscription.title')}</h3>
        <div className="rounded-xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {subscription?.plan?.name ?? (plan === 'trial' ? t('subscription.trial') : plan)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {subscription ? (
                  subscription.cancelAtPeriodEnd
                    ? t('subscription.cancelsAt', { date: format(new Date(subscription.currentPeriodEnd), 'PP') })
                    : t('subscription.renewsOn', { date: format(new Date(subscription.currentPeriodEnd), 'PP') })
                ) : plan === 'trial' && trialEndsAt ? (
                  t('subscription.trialEndsOn', { date: format(new Date(trialEndsAt), 'PP') })
                ) : (
                  t('subscription.noPlan')
                )}
              </p>
            </div>
            <Badge className={STATUS_COLORS[statusKey] ?? ''}>
              {t(`statusLabels.${statusKey}`, { defaultValue: statusKey })}
            </Badge>
          </div>

          {subscription && (
            <p className="text-xs text-muted-foreground">
              {t('subscription.memberLimit', { max: subscription.plan?.maxMembers ?? 5 })}
            </p>
          )}

          {isOwner && subscription && !subscription.cancelAtPeriodEnd && (
            <Button size="sm" variant="outline" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : null}
              {t('subscription.manageSubscription')}
            </Button>
          )}
        </div>
      </div>

      {/* Plan selection */}
      <div>
        <h3 className="text-sm font-semibold mb-2">{t('planSelection.title')}</h3>
        <LandingPricing showHeading={false} />
      </div>
    </div>
  );
}

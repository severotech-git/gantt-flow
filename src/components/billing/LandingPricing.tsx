'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Info, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useAccountStore } from '@/store/useAccountStore';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { IPlan } from '@/types';

const MONTHLY_FEATURES = [
  'unlimitedProjects',
  'freeTrial',
  'versionSnapshots',
  'hierarchical',
  'customStatuses',
  'support',
] as const;

const YEARLY_FEATURES = [
  'everythingMonthly',
  'freeTrial',
  'annualSavings',
  'priorityFeatures',
  'teamControls',
  'dataExport',
] as const;

// ─── PlanCard ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  featKeys,
  featured,
  ctaLabel,
  isCurrent,
  isLoading,
  onSubscribe,
  disabledLabel,
  onChangePlan,
  changePlanLabel,
  changePlanLoading,
}: {
  plan: IPlan;
  featKeys: readonly string[];
  featured?: boolean;
  ctaLabel: string;
  isCurrent?: boolean;
  isLoading?: boolean;
  onSubscribe?: (priceId: string) => void;
  disabledLabel?: string;
  onChangePlan?: () => void;
  changePlanLabel?: string;
  changePlanLoading?: boolean;
}) {
  const t = useTranslations('landing');
  const price = plan.amount / 100;
  const isYearly = plan.interval === 'year';
  const savePct = isYearly ? 16 : 0;

  let cta: React.ReactNode;

  if (disabledLabel) {
    cta = (
      <Button className="w-full h-12 text-base font-semibold mt-auto" variant="outline" size="lg" disabled>
        {disabledLabel}
      </Button>
    );
  } else if (onChangePlan) {
    cta = isCurrent ? (
      <Button className="w-full h-12 text-base font-semibold mt-auto" variant="default" size="lg" disabled>
        <span className="flex items-center gap-1.5">
          <Check size={14} /> {t('pricing.currentPlan')}
        </span>
      </Button>
    ) : (
      <Button
        className="w-full h-12 text-base font-semibold mt-auto"
        variant="outline"
        size="lg"
        disabled={changePlanLoading}
        onClick={onChangePlan}
      >
        {changePlanLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
        {changePlanLabel}
      </Button>
    );
  } else if (onSubscribe) {
    cta = (
      <Button
        className="w-full h-12 text-base font-semibold mt-auto"
        variant={featured ? 'default' : 'outline'}
        size="lg"
        disabled={isCurrent || isLoading}
        onClick={() => onSubscribe(plan.stripePriceId)}
      >
        {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
        {isCurrent ? (
          <span className="flex items-center gap-1.5">
            <Check size={14} /> {t('pricing.currentPlan')}
          </span>
        ) : ctaLabel}
      </Button>
    );
  } else {
    cta = (
      <Link href="/register" className="mt-auto">
        <Button className="w-full h-12 text-base font-semibold" variant={featured ? 'default' : 'outline'} size="lg">
          {ctaLabel}
        </Button>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-3xl border p-8 transition-all duration-200',
        featured
          ? 'border-2 border-primary bg-surface-2 shadow-2xl shadow-primary/15 scale-[1.02]'
          : 'border-border bg-surface-2',
        isCurrent && 'ring-2 ring-primary/40'
      )}
    >
      {featured && savePct > 0 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">
          {t('pricing.yearly.badge')}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">
            {isYearly ? t('pricing.yearly.title') : t('pricing.monthly.title')}
          </h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {t('pricing.members', { count: plan.maxMembers })}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-extrabold tracking-tight">
            R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-muted-foreground text-sm font-medium">
            {isYearly ? t('pricing.yearly.period') : t('pricing.monthly.period')}
          </span>
        </div>
      </div>

      <ul className="space-y-3.5 mb-8 flex-grow">
        {featKeys.map((key) => (
          <li key={key} className="flex items-center gap-3 text-sm text-foreground/80">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
              featured ? 'bg-primary/20' : 'bg-primary/10'
            )}>
              <Check className="w-3 h-3 text-primary" strokeWidth={3} />
            </div>
            {t(`pricing.features.${key}`)}
          </li>
        ))}
      </ul>

      {cta}
    </div>
  );
}

// ─── Non-owner notice ────────────────────────────────────────────────────────

function NonOwnerNotice({
  workspaceName,
  ownerName,
  ownerEmail,
}: {
  workspaceName: string;
  ownerName: string | null;
  ownerEmail: string | null;
}) {
  const t = useTranslations('landing');

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Info size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t('pricing.nonOwner.title')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('pricing.nonOwner.description', { workspace: workspaceName })}
          </p>

          {ownerName && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
              <OwnerAvatar name={ownerName} size={36} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{ownerName}</p>
                {ownerEmail && (
                  <p className="text-xs text-muted-foreground truncate">{ownerEmail}</p>
                )}
              </div>
              {ownerEmail && (
                <a
                  href={`mailto:${ownerEmail}?subject=${encodeURIComponent(t('pricing.nonOwner.emailSubject'))}`}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Mail size={13} />
                  {t('pricing.nonOwner.contact')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Billing logic hook ──────────────────────────────────────────────────────

function useBillingState() {
  const { data: session, status } = useSession();
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const members = useAccountStore((s) => s.members);
  const fetchMembers = useAccountStore((s) => s.fetchMembers);
  const subscription = useAccountStore((s) => s.subscription);
  const fetchSubscription = useAccountStore((s) => s.fetchSubscription);
  const createCheckout = useAccountStore((s) => s.createCheckout);
  const createPortalSession = useAccountStore((s) => s.createPortalSession);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const activeAccountId = session?.user?.activeAccountId;

  useEffect(() => {
    if (isLoggedIn) {
      fetchAccounts();
      fetchSubscription();
    }
  }, [isLoggedIn, fetchAccounts, fetchSubscription]);

  useEffect(() => {
    if (isLoggedIn && activeAccountId) {
      fetchMembers(activeAccountId);
    }
  }, [isLoggedIn, activeAccountId, fetchMembers]);

  const currentAccount = accounts.find((a) => a._id === activeAccountId);
  const isOwner = currentAccount?.members?.find((m) => m.userId === session?.user?.id)?.role === 'owner';
  const canSubscribe = isLoggedIn && isOwner && !subscription;
  const hasSubscription = isLoggedIn && isOwner && !!subscription;
  const isNonOwnerMember = isLoggedIn && !!currentAccount && !isOwner;

  // Resolve owner info
  const ownerMemberId = currentAccount?.members?.find((m) => m.role === 'owner')?.userId;
  const ownerEnriched = members.find((m) => m.userId === ownerMemberId);
  const ownerSettingsUser = currentAccount?.settings?.users?.find((u: { uid: string }) => u.uid === ownerMemberId);
  const ownerName = ownerEnriched?.user?.name ?? ownerSettingsUser?.name ?? null;
  const ownerEmail = ownerEnriched?.user?.email ?? null;

  const currentPlanSlug = subscription?.plan?.slug ?? (session?.user?.plan === 'trial' ? null : (session?.user?.plan ?? null));

  const handleSubscribe = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const url = await createCheckout(priceId);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setCheckoutLoading(null);
    }
  };

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

  return {
    canSubscribe,
    hasSubscription,
    isNonOwnerMember,
    currentPlanSlug,
    checkoutLoading,
    portalLoading,
    handleSubscribe,
    handlePortal,
    ownerName,
    ownerEmail,
    workspaceName: currentAccount?.name ?? '',
  };
}

// ─── LandingPricing ──────────────────────────────────────────────────────────

interface LandingPricingProps {
  /** Hide the section heading (useful when embedded in settings) */
  showHeading?: boolean;
}

export function LandingPricing({ showHeading = true }: LandingPricingProps) {
  const t = useTranslations('landing');
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [tab, setTab] = useState<'month' | 'year'>('month');

  const {
    canSubscribe,
    hasSubscription,
    isNonOwnerMember,
    currentPlanSlug,
    checkoutLoading,
    portalLoading,
    handleSubscribe,
    handlePortal,
    ownerName,
    ownerEmail,
    workspaceName,
  } = useBillingState();

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((data: IPlan[]) => Array.isArray(data) && setPlans(data))
      .catch(() => {});
  }, []);

  const visible = plans.filter((p) => p.interval === tab);
  const sorted = [...visible].sort((a, b) => a.maxMembers - b.maxMembers);
  const yearlyTab = tab === 'year';

  // Derive card props based on billing state
  const disabledLabel = isNonOwnerMember ? t('pricing.nonOwner.ctaDisabled') : undefined;
  const onSubscribe = canSubscribe ? handleSubscribe : undefined;
  const onChangePlan = hasSubscription ? handlePortal : undefined;
  const changePlanLabel = hasSubscription ? t('pricing.changePlan') : undefined;

  return (
    <section id="pricing" className="py-24 border-t border-border/40">
      <div className="container mx-auto px-4">
        {showHeading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('pricing.sectionTitle')}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t('pricing.sectionSubtitle')}</p>
          </div>
        )}

        {/* Month / Year toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
            <button
              onClick={() => setTab('month')}
              className={cn(
                'px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
                tab === 'month'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('pricing.tabMonthly')}
            </button>
            <button
              onClick={() => setTab('year')}
              className={cn(
                'relative px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2',
                tab === 'year'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('pricing.tabYearly')}
              <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                −16%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        {sorted.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
            {sorted.map((plan, idx) => {
              const isFeatured = yearlyTab && sorted.length > 1
                ? idx === sorted.length - 1
                : yearlyTab;
              const ctaLabel = onSubscribe
                ? tab === 'year' ? t('pricing.subscribeYearly') : t('pricing.subscribe')
                : tab === 'year' ? t('pricing.getStartedYearly') : t('pricing.startFreeTrial');
              return (
                <PlanCard
                  key={plan._id}
                  plan={plan}
                  featKeys={tab === 'year' ? YEARLY_FEATURES : MONTHLY_FEATURES}
                  featured={isFeatured}
                  ctaLabel={ctaLabel}
                  isCurrent={plan.slug === currentPlanSlug}
                  isLoading={checkoutLoading === plan.stripePriceId}
                  onSubscribe={onSubscribe}
                  disabledLabel={disabledLabel}
                  onChangePlan={onChangePlan}
                  changePlanLabel={changePlanLabel}
                  changePlanLoading={portalLoading}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[0, 1].map((i) => (
              <div key={i} className="h-96 rounded-3xl border border-border bg-surface-2 animate-pulse" />
            ))}
          </div>
        )}

        {/* Non-owner notice */}
        {isNonOwnerMember && (
          <NonOwnerNotice
            workspaceName={workspaceName}
            ownerName={ownerName}
            ownerEmail={ownerEmail}
          />
        )}

        <p className="text-center mt-12 text-sm text-muted-foreground">
          {t('pricing.disclaimer')}
        </p>
      </div>
    </section>
  );
}

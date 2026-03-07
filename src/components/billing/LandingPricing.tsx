'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
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

function PlanCard({
  plan,
  featKeys,
  featured,
  ctaLabel,
  isCurrent,
  isLoading,
  onSubscribe,
}: {
  plan: IPlan;
  featKeys: readonly string[];
  featured?: boolean;
  ctaLabel: string;
  isCurrent?: boolean;
  isLoading?: boolean;
  onSubscribe?: (priceId: string) => void;
}) {
  const t = useTranslations('landing');
  const price = plan.amount / 100;
  const isYearly = plan.interval === 'year';
  const savePct = isYearly ? 16 : 0;

  const cta = onSubscribe ? (
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
  ) : (
    <Link href="/register" className="mt-auto">
      <Button
        className="w-full h-12 text-base font-semibold"
        variant={featured ? 'default' : 'outline'}
        size="lg"
      >
        {ctaLabel}
      </Button>
    </Link>
  );

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
      {/* Badge */}
      {featured && savePct > 0 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider whitespace-nowrap">
          {t('pricing.yearly.badge')}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">
            {isYearly ? t('pricing.yearly.title') : t('pricing.monthly.title')}
          </h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            {plan.maxMembers} {plan.maxMembers === 1 ? 'member' : 'members'}
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

      {/* Features */}
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

interface LandingPricingProps {
  /** When provided, renders subscribe buttons instead of register links */
  onSubscribe?: (priceId: string) => void;
  /** Slug of the plan the user is currently on */
  currentPlanSlug?: string | null;
  /** priceId currently being checked out */
  checkoutLoading?: string | null;
  /** Hide the section heading (useful when embedded in settings) */
  showHeading?: boolean;
}

export function LandingPricing({
  onSubscribe,
  currentPlanSlug,
  checkoutLoading,
  showHeading = true,
}: LandingPricingProps) {
  const t = useTranslations('landing');
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [tab, setTab] = useState<'month' | 'year'>('month');

  useEffect(() => {
    fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((data: IPlan[]) => Array.isArray(data) && setPlans(data))
      .catch(() => {});
  }, []);

  const visible = plans.filter((p) => p.interval === tab);
  const sorted = [...visible].sort((a, b) => a.maxMembers - b.maxMembers);
  const yearlyTab = tab === 'year';

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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
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

        <p className="text-center mt-12 text-sm text-muted-foreground">
          {t('pricing.disclaimer')}
        </p>
      </div>
    </section>
  );
}

'use client';

import { IPlan } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface PlanCardProps {
  plan: IPlan;
  isCurrent?: boolean;
  isLoading?: boolean;
  onSubscribe?: (priceId: string) => void;
}

export function PlanCard({ plan, isCurrent, isLoading, onSubscribe }: PlanCardProps) {
  const t = useTranslations('billing');
  const isYearly = plan.interval === 'year';
  const price = plan.amount / 100;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-xl border p-5',
        isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card',
        isYearly && !isCurrent && 'border-violet-500/40'
      )}
    >
      {isYearly && (
        <Badge className="absolute -top-2.5 right-4 bg-violet-600 text-white text-2xs">
          {t('planSelection.bestValue')}
        </Badge>
      )}

      <div>
        <p className="text-sm font-semibold">{plan.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t('planSelection.maxMembers', { count: plan.maxMembers })}
        </p>
      </div>

      <div>
        <span className="text-2xl font-bold">R${price.toFixed(2).replace('.', ',')}</span>
        <span className="text-xs text-muted-foreground">
          {' / '}{isYearly ? t('planSelection.yearLabel') : t('planSelection.monthLabel')}
        </span>
      </div>

      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Check size={13} />
          {t('planSelection.currentPlan')}
        </div>
      ) : (
        <Button
          size="sm"
          variant={isYearly ? 'default' : 'outline'}
          onClick={() => onSubscribe?.(plan.stripePriceId)}
          disabled={isLoading}
          className="w-full"
        >
          {t('planSelection.subscribe')}
        </Button>
      )}
    </div>
  );
}

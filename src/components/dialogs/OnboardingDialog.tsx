'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useProjectStore } from '@/store/useProjectStore';
import { cn } from '@/lib/utils';
import {
  Code2,
  Megaphone,
  HardHat,
  GraduationCap,
  PartyPopper,
  Rocket,
  Layers,
  Users,
  User,
  UsersRound,
  Building2,
  Target,
  Kanban,
  Map,
  BarChart3,
  LayoutGrid,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { key: 'software', icon: Code2, color: '#6366f1' },
  { key: 'marketing', icon: Megaphone, color: '#ec4899' },
  { key: 'construction', icon: HardHat, color: '#f97316' },
  { key: 'education', icon: GraduationCap, color: '#10b981' },
  { key: 'events', icon: PartyPopper, color: '#8b5cf6' },
  { key: 'product', icon: Rocket, color: '#0ea5e9' },
  { key: 'other', icon: Layers, color: '#64748b' },
] as const;

const TEAM_SIZES = [
  { key: 'solo', icon: User },
  { key: 'small', icon: Users },
  { key: 'medium', icon: UsersRound },
  { key: 'large', icon: Building2 },
] as const;

const USE_CASES = [
  { key: 'project-tracking', icon: Target },
  { key: 'sprint-planning', icon: Kanban },
  { key: 'roadmap', icon: Map },
  { key: 'campaign', icon: BarChart3 },
  { key: 'general', icon: LayoutGrid },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

interface OnboardingDialogProps {
  open: boolean;
  onSkip: () => void;
}

export function OnboardingDialog({ open, onSkip }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [useCase, setUseCase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const t = useTranslations('onboarding');
  const router = useRouter();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  function handleSkip() {
    onSkip();
  }

  async function handleSubmit() {
    setStep(2);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, teamSize, useCase }),
      });
      const data = await res.json();
      completeOnboarding();
      await fetchProjects();
      if (data._id) {
        router.push(`/projects/${data._id}`);
      }
    } catch {
      // On error, still close the modal
      completeOnboarding();
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:!max-w-3xl"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step 0: Welcome + Industry */}
        {step === 0 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('welcome.title')}</DialogTitle>
              <DialogDescription>{t('welcome.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 mt-2">
              <label className="text-sm font-medium text-foreground">
                {t('industry.label')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INDUSTRIES.map(({ key, icon: Icon, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIndustry(key)}
                    className={cn(
                      'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm cursor-pointer',
                      industry === key
                        ? 'border-blue-500 bg-blue-500/10 text-foreground ring-1 ring-blue-500'
                        : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: color }}
                    >
                      <Icon size={14} className="text-white" />
                    </div>
                    <span>{t(`industry.${key}`)}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {t('actions.skip')}
                </button>
                <Button
                  disabled={!industry}
                  onClick={() => setStep(1)}
                >
                  {t('actions.next')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 1: Team Size + Use Case */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('welcome.title')}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-5 mt-2">
              {/* Team size */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  {t('teamSize.label')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEAM_SIZES.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTeamSize(key)}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm cursor-pointer',
                        teamSize === key
                          ? 'border-blue-500 bg-blue-500/10 text-foreground ring-1 ring-blue-500'
                          : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span>{t(`teamSize.${key}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Use case */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">
                  {t('useCase.label')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {USE_CASES.map(({ key, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setUseCase(key)}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm cursor-pointer',
                        useCase === key
                          ? 'border-blue-500 bg-blue-500/10 text-foreground ring-1 ring-blue-500'
                          : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span>{t(`useCase.${key}`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(0)}
                    className="text-muted-foreground hover:text-foreground gap-1"
                  >
                    <ArrowLeft size={14} />
                    {t('actions.back')}
                  </Button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {t('actions.skip')}
                  </button>
                </div>
                <Button
                  disabled={!teamSize || !useCase}
                  onClick={handleSubmit}
                >
                  {t('actions.createSample')}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Generating */}
        {step === 2 && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            {isGenerating && (
              <Loader2 size={32} className="animate-spin text-blue-500" />
            )}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">
                {t('generating.title')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('generating.subtitle')}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

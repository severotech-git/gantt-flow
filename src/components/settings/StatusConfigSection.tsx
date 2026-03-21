'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCanManage } from '@/hooks/useAccountRole';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { IStatusConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColorSwatch } from './ColorSwatch';
import { ReassignStatusDialog } from '@/components/dialogs/ReassignStatusDialog';
import { Trash2, ChevronUp, ChevronDown, Plus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

function generateValue(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

export function StatusConfigSection() {
  const t = useTranslations('settings.statuses');
  const { statuses, addStatus, updateStatus, deleteStatus, reorderStatuses, persistSettings, isSaving } = useSettingsStore();
  const canManage = useCanManage();

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [reassignTarget, setReassignTarget] = useState<IStatusConfig | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/status-usage');
      if (res.ok) setUsageCounts(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (canManage) fetchUsage();
  }, [canManage, fetchUsage]);

  function handleMoveUp(idx: number) {
    if (idx === 0) return;
    const next = [...statuses];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    reorderStatuses(next);
  }

  function handleMoveDown(idx: number) {
    if (idx === statuses.length - 1) return;
    const next = [...statuses];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    reorderStatuses(next);
  }

  function handleAdd() {
    const newStatus: IStatusConfig = {
      value: generateValue('new-status'),
      label: t('newStatusLabel'),
      color: '#6366f1',
      isFinal: false,
    };
    addStatus(newStatus);
  }

  function handleDeleteClick(st: IStatusConfig) {
    const count = usageCounts[st.value] || 0;
    if (count > 0) {
      setReassignTarget(st);
    } else {
      deleteStatus(st.value);
    }
  }

  async function handleReassignConfirm(toStatus: string) {
    if (!reassignTarget) return;
    const res = await fetch('/api/settings/status-reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromStatus: reassignTarget.value, toStatus }),
    });
    if (res.ok) {
      deleteStatus(reassignTarget.value);
      await persistSettings('statuses');
      setReassignTarget(null);
      fetchUsage();
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {!canManage && <ReadOnlyBanner />}

      <p className="text-[11px] text-muted-foreground/60">
        <Lock size={11} className="inline -mt-0.5 mr-1" />
        {t('systemHint')}
      </p>

      <div className="space-y-1.5">
        {statuses.map((st, idx) => (
          <StatusRow
            key={st.value}
            status={st}
            idx={idx}
            total={statuses.length}
            readonly={!canManage}
            usageCount={usageCounts[st.value] || 0}
            onMoveUp={() => handleMoveUp(idx)}
            onMoveDown={() => handleMoveDown(idx)}
            onDelete={() => handleDeleteClick(st)}
            onUpdate={(patch) => updateStatus(st.value, patch)}
          />
        ))}

        {canManage && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 w-full p-2.5 rounded-lg border border-dashed border-border hover:border-blue-500/50 hover:bg-blue-500/5 text-sm text-muted-foreground hover:text-blue-400 transition-colors"
          >
            <Plus size={14} />
            {t('addStatus')}
          </button>
        )}
      </div>

      {canManage && (
        <Button
          onClick={() => persistSettings('statuses')}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {isSaving ? t('saving') : t('saveButton')}
        </Button>
      )}

      {reassignTarget && (
        <ReassignStatusDialog
          open
          onClose={() => setReassignTarget(null)}
          statusToDelete={reassignTarget}
          usageCount={usageCounts[reassignTarget.value] || 0}
          availableStatuses={statuses.filter((s) => s.value !== reassignTarget.value)}
          onConfirm={handleReassignConfirm}
        />
      )}
    </div>
  );
}

interface StatusRowProps {
  status: IStatusConfig;
  idx: number;
  total: number;
  readonly: boolean;
  usageCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<IStatusConfig>) => void;
}

function StatusRow({ status, idx, total, readonly, usageCount, onMoveUp, onMoveDown, onDelete, onUpdate }: StatusRowProps) {
  const t = useTranslations('settings.statuses');
  const isSystem = !!status.isSystem;
  const isFinalLocked = isSystem || readonly;

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border group transition-colors',
      isSystem
        ? 'bg-muted/20 border-border/60'
        : 'bg-muted/30 border-border hover:border-border/80'
    )}>
      <ColorSwatch color={status.color} onChange={readonly ? () => {} : (c) => onUpdate({ color: c })} size={24} />

      <Input
        value={status.label}
        onChange={(e) => !readonly && onUpdate({ label: e.target.value })}
        disabled={readonly}
        className="flex-1 h-7 text-xs focus-visible:ring-blue-500"
      />

      {usageCount > 0 && (
        <span className="text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
          {t('usageCount', { count: usageCount })}
        </span>
      )}

      <button
        onClick={() => !isFinalLocked && onUpdate({ isFinal: !status.isFinal })}
        disabled={isFinalLocked}
        title={isSystem ? t('systemStatusTitle') : status.isFinal ? t('terminalTitle') : t('nonTerminalTitle')}
        className={cn(
          'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors shrink-0',
          status.isFinal
            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
            : 'border-border text-muted-foreground/60 hover:text-muted-foreground',
          isFinalLocked && 'cursor-default opacity-60'
        )}
      >
        {status.isFinal ? t('finalBadge') : t('activeBadge')}
      </button>

      {isSystem && (
        <span title={t('systemStatusTitle')} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/50 border border-border/50 shrink-0">
          <Lock size={10} />
        </span>
      )}

      {!readonly && (
        <>
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onMoveUp} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
              <ChevronUp size={12} />
            </button>
            <button onClick={onMoveDown} disabled={idx === total - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
              <ChevronDown size={12} />
            </button>
          </div>
          {!isSystem && (
            <button
              onClick={onDelete}
              className="text-muted-foreground/60 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title={t('deleteTitle')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

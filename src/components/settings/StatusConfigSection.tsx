'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { IStatusConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColorSwatch } from './ColorSwatch';
import { Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function generateValue(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6);
}

export function StatusConfigSection() {
  const { statuses, addStatus, updateStatus, deleteStatus, reorderStatuses, persistSettings, isSaving } = useSettingsStore();

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
      label: 'New Status',
      color: '#6366f1',
      isFinal: false,
    };
    addStatus(newStatus);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Status List</h2>
        <p className="text-sm text-muted-foreground">Define the statuses available for tasks, features, and epics.</p>
      </div>

      <div className="space-y-2">
        {statuses.map((st, idx) => (
          <StatusRow
            key={st.value}
            status={st}
            idx={idx}
            total={statuses.length}
            onMoveUp={() => handleMoveUp(idx)}
            onMoveDown={() => handleMoveDown(idx)}
            onDelete={() => deleteStatus(st.value)}
            onUpdate={(patch) => updateStatus(st.value, patch)}
          />
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors group"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-border group-hover:border-violet-500 transition-colors">
          <Plus size={11} />
        </span>
        Add Status
      </button>

      <Button
        onClick={persistSettings}
        disabled={isSaving}
        className="bg-violet-600 hover:bg-violet-500 text-white"
      >
        {isSaving ? 'Saving…' : 'Save Statuses'}
      </Button>
    </div>
  );
}

interface StatusRowProps {
  status: IStatusConfig;
  idx: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<IStatusConfig>) => void;
}

function StatusRow({ status, idx, total, onMoveUp, onMoveDown, onDelete, onUpdate }: StatusRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border group">
      {/* Color */}
      <ColorSwatch color={status.color} onChange={(c) => onUpdate({ color: c })} size={24} />

      {/* Label */}
      <Input
        value={status.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="flex-1 h-7 text-xs focus-visible:ring-violet-500"
      />

      {/* isFinal toggle */}
      <button
        onClick={() => onUpdate({ isFinal: !status.isFinal })}
        title={status.isFinal ? 'Terminal state (no overdue)' : 'Non-terminal state'}
        className={cn(
          'px-2 py-0.5 rounded text-[10px] font-medium border transition-colors shrink-0',
          status.isFinal
            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
            : 'border-border text-muted-foreground/60 hover:text-muted-foreground'
        )}
      >
        {status.isFinal ? 'Final' : 'Active'}
      </button>

      {/* Reorder */}
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onMoveUp}
          disabled={idx === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={idx === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={total <= 1}
        className="text-muted-foreground/60 hover:text-red-500 disabled:opacity-20 transition-colors opacity-0 group-hover:opacity-100"
        title="Delete status"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

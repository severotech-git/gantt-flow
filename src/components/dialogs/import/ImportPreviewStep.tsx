'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportResult } from '@/lib/importUtils';
import type { IStatusConfig } from '@/types';

interface Props {
  result: ImportResult;
  levelNames: { epic: string; feature: string; task: string };
  statuses: IStatusConfig[];
  onBack: () => void;
  onImport: () => void;
  importing: boolean;
}

export function ImportPreviewStep({
  result,
  levelNames,
  statuses,
  onBack,
  onImport,
  importing,
}: Props) {
  const t = useTranslations('dialogs.importProject');
  const [expandedEpics, setExpandedEpics] = useState<Set<number>>(new Set([0]));
  const [showWarnings, setShowWarnings] = useState(false);

  const statusColor = (statusVal: string) => {
    return statuses.find((s) => s.value === statusVal)?.color ?? '#94a3b8';
  };

  const toggleEpic = (idx: number) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) { next.delete(idx); } else { next.add(idx); }
      return next;
    });
  };

  const { epics, warnings, counts } = result;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <span>{t('preview.summary', {
          epics: counts.epics,
          epicLabel: levelNames.epic,
          features: counts.features,
          featureLabel: levelNames.feature,
          tasks: counts.tasks,
          taskLabel: levelNames.task,
        })}</span>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-500"
            onClick={() => setShowWarnings((v) => !v)}
          >
            <AlertTriangle size={12} />
            {t('preview.warningsTitle', { count: warnings.length })}
            {showWarnings ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {showWarnings && (
            <div className="pl-4 flex flex-col gap-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium">{t('preview.rowLabel', { row: w.row })}: </span>
                  {w.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No data */}
      {epics.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">{t('preview.noData')}</p>
      )}

      {/* Tree preview */}
      {epics.length > 0 && (
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto rounded-lg border border-border p-2">
          {epics.map((epic, ei) => (
            <div key={ei}>
              {/* Epic row */}
              <div
                className="flex items-center gap-2 py-1 px-1 rounded cursor-pointer hover:bg-muted/50"
                onClick={() => toggleEpic(ei)}
              >
                {expandedEpics.has(ei) ? <ChevronDown size={12} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={12} className="shrink-0 text-muted-foreground" />}
                <span className="text-xs font-semibold text-foreground truncate flex-1">{epic.name}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: `${statusColor(epic.status)}25`, color: statusColor(epic.status) }}
                >
                  {epic.status}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{levelNames.epic}</span>
              </div>

              {/* Features */}
              {expandedEpics.has(ei) && epic.features.map((feat, fi) => (
                <div key={fi}>
                  <div className="flex items-center gap-2 py-1 pl-6 pr-1 rounded hover:bg-muted/30">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0')} style={{ backgroundColor: statusColor(feat.status) }} />
                    <span className="text-xs text-foreground truncate flex-1">{feat.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{levelNames.feature}</span>
                  </div>
                  {feat.tasks.map((task, ti) => (
                    <div key={ti} className="flex items-center gap-2 py-0.5 pl-10 pr-1 rounded hover:bg-muted/20">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="text-[11px] text-muted-foreground truncate flex-1">{task.name}</span>
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">{levelNames.task}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={importing} className="text-muted-foreground hover:text-foreground">
          {t('actions.back')}
        </Button>
        <Button
          type="button"
          disabled={importing || epics.length === 0}
          onClick={onImport}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {importing ? t('actions.importing') : t('actions.import')}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IFeature, IStatusConfig } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

export interface StandaloneFeatureEntry {
  feature: IFeature;
  epicId: string;
  epicName: string;
  epicColor?: string;
}

// One droppable status column for standalone features
function StandaloneStatusCell({
  status,
  entries,
  isDragging,
}: {
  status: IStatusConfig;
  entries: StandaloneFeatureEntry[];
  isDragging: boolean;
}) {
  const t = useTranslations('kanban');
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-feat-drop-${status.value}`,
    data: { statusValue: status.value, zoneType: 'standalone' },
  });

  const matching = entries.filter((e) => e.feature.status === status.value);

  return (
    <div className="flex flex-col border-r border-border/20 last:border-r-0 min-w-0">
      {/* Mini header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/20 bg-accent/10 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide truncate flex-1">
          {status.label}
        </span>
        {matching.length > 0 && (
          <span className="text-2xs text-muted-foreground/70 shrink-0 tabular-nums">
            {matching.length}
          </span>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 flex flex-col gap-2 min-h-[72px] transition-colors',
          isOver && isDragging && 'bg-primary/[0.04] ring-1 ring-inset ring-primary/10'
        )}
      >
        {matching.map(({ feature, epicId, epicName, epicColor }) => (
          <KanbanCard
            key={feature._id}
            item={feature}
            epicId={epicId}
            featureId={feature._id}
            isFeatureCard
            epicName={epicName}
            epicColor={epicColor}
            featureName={feature.name}
          />
        ))}
        {isOver && isDragging && (
          <div className="border-2 border-dashed border-primary/25 rounded-lg h-14 bg-primary/5 flex items-center justify-center shrink-0">
            <span className="text-2xs text-primary/50">
              {t('dropHere', { status: status.label })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanStandaloneSectionProps {
  entries: StandaloneFeatureEntry[];
  statuses: IStatusConfig[];
  collapsed: boolean;
  onToggle: () => void;
  isDragging: boolean;
  /** Shared scroll handler for synchronized horizontal scrolling */
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function KanbanStandaloneSection({
  entries,
  statuses,
  collapsed,
  onToggle,
  isDragging,
  onScroll,
}: KanbanStandaloneSectionProps) {
  const t = useTranslations('kanban');
  const levelNames = useSettingsStore((s) => s.levelNames);
  const gridTemplate = `repeat(${statuses.length}, minmax(190px, 1fr))`;

  return (
    <div className="border-b border-border/30">
      {/* Section header — full width, does NOT scroll horizontally */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-2 bg-accent/10 hover:bg-accent/20 transition-colors text-left border-t border-border/40"
        aria-expanded={!collapsed}
      >
        {collapsed
          ? <ChevronRight size={13} className="text-muted-foreground shrink-0" />
          : <ChevronDown size={13} className="text-muted-foreground shrink-0" />
        }
        <Layers size={13} className="text-muted-foreground/60 shrink-0" />
        <span className="text-xs font-medium text-muted-foreground italic flex-1">
          {t('standaloneSection', { featureLabel: levelNames.feature })}
        </span>
        <span className="text-2xs text-muted-foreground/50 shrink-0">
          ({entries.length})
        </span>
      </button>

      {/* Expanded: status columns — scrolls horizontally (synced) */}
      {!collapsed && (
        <div
          data-kanban-scroll
          onScroll={onScroll}
          className="overflow-x-auto border-t border-border/10"
        >
          <div
            className="min-w-max"
            style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
          >
          {statuses.map((status) => (
            <StandaloneStatusCell
              key={status.value}
              status={status}
              entries={entries}
              isDragging={isDragging}
            />
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

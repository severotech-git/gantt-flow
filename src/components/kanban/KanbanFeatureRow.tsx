'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Bookmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IFeature, ITask, IStatusConfig } from '@/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { useSettingsStore } from '@/store/useSettingsStore';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

// Per-feature, per-status droppable cell
function FeatureStatusCell({
  status,
  feature,
  epicId,
  epicName,
  epicColor,
  tasks,
  totalTasks,
  isDragging,
}: {
  status: IStatusConfig;
  feature: IFeature;
  epicId: string;
  epicName: string;
  epicColor?: string;
  tasks: ITask[];
  totalTasks: number;
  isDragging: boolean;
}) {
  const t = useTranslations('kanban');
  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-task-drop-${feature._id}-${status.value}`,
    data: { statusValue: status.value, featureId: feature._id, epicId, zoneType: 'task' },
  });

  return (
    <div className="flex flex-col border-r border-border/20 last:border-r-0 min-w-0">
      {/* Mini column header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/20 bg-accent/10 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate flex-1">
          {status.label}
        </span>
        {totalTasks > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground/70 shrink-0">
            {tasks.length}/{totalTasks}
          </span>
        )}
      </div>

      {/* Droppable card area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 flex flex-col gap-2 min-h-[80px] transition-colors',
          isOver && isDragging && 'bg-primary/[0.04] ring-1 ring-inset ring-primary/10'
        )}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task._id}
            item={task}
            epicId={epicId}
            featureId={feature._id}
            taskId={task._id}
            epicName={epicName}
            epicColor={epicColor}
            featureName={feature.name}
            compact
          />
        ))}
        {isOver && isDragging && (
          <div className="border-2 border-dashed border-primary/25 rounded-lg h-14 bg-primary/5 flex items-center justify-center shrink-0">
            <span className="text-[10px] text-primary/50">
              {t('dropHere', { status: status.label })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanFeatureRowProps {
  feature: IFeature;
  epicId: string;
  epicName: string;
  epicColor?: string;
  statuses: IStatusConfig[];
  collapsed: boolean;
  onToggle: () => void;
  /** Pre-filtered tasks to show (honours owner/overdue/search filters) */
  filteredTasks: ITask[];
  isDragging: boolean;
  /** Scroll handler shared across all card-grid zones for synchronized horizontal scrolling */
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function KanbanFeatureRow({
  feature,
  epicId,
  epicName,
  epicColor,
  statuses,
  collapsed,
  onToggle,
  filteredTasks,
  isDragging,
  onScroll,
}: KanbanFeatureRowProps) {
  const t = useTranslations('kanban');
  const users = useSettingsStore((s) => s.users);
  const owner = feature.ownerId ? users.find((u) => u.uid === feature.ownerId) : undefined;

  const totalTasks = feature.tasks.length;
  const gridTemplate = `repeat(${statuses.length}, minmax(190px, 1fr))`;

  return (
    <div className="border-b border-border/30">
      {/* Feature header — full width, collapsible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-accent/20 hover:bg-accent/30 transition-colors text-left group/header"
        aria-expanded={!collapsed}
      >
        {collapsed
          ? <ChevronRight size={14} className="text-muted-foreground shrink-0" />
          : <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        }

        {/* Icon */}
        {epicColor
          ? <Bookmark size={13} style={{ color: epicColor }} className="shrink-0" />
          : <Bookmark size={13} className="text-primary/50 shrink-0" />
        }

        {/* Feature name */}
        <span className="text-xs font-semibold text-foreground truncate min-w-0 flex-1">
          {feature.name}
        </span>

        {/* Task count */}
        <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
          {t('subtasksCount', { count: totalTasks })}
        </span>

        {/* Epic parent */}
        {epicColor && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: epicColor }} />
        )}
        <span className="text-[10px] text-muted-foreground/70 truncate max-w-[100px] shrink-0 hidden sm:block">
          {epicName}
        </span>

        {/* Feature status badge */}
        <StatusBadge status={feature.status} className="text-[9px] px-1 py-px shrink-0" />

        {/* Feature owner */}
        <OwnerAvatar name={owner?.name} color={owner?.color} size={22} />
      </button>

      {/* Expanded: per-status columns — this div scrolls horizontally (synced) */}
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
          {statuses.map((status) => {
            const tasksInStatus = filteredTasks.filter((t) => t.status === status.value);
            return (
              <FeatureStatusCell
                key={status.value}
                status={status}
                feature={feature}
                epicId={epicId}
                epicName={epicName}
                epicColor={epicColor}
                tasks={tasksInStatus}
                totalTasks={totalTasks}
                isDragging={isDragging}
              />
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

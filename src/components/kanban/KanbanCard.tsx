'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { ITask, IFeature } from '@/types';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getDelayDays } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  item: ITask | IFeature;
  epicId: string;
  featureId: string;
  taskId?: string;
  isFeatureCard?: boolean;
  epicName: string;
  epicColor?: string;
  featureName: string;
  /** When true, hides the breadcrumb row (used inside feature swim lanes where context is shown in the lane header) */
  compact?: boolean;
  disabled?: boolean;
}

export function KanbanCard({
  item,
  epicId,
  featureId,
  taskId,
  isFeatureCard,
  epicName,
  epicColor,
  featureName,
  compact,
  disabled,
}: KanbanCardProps) {
  const t = useTranslations('kanban');
  const fmt = useFormatter();
  const openItem = useProjectStore((s) => s.openItem);
  const users = useSettingsStore((s) => s.users);
  const statuses = useSettingsStore((s) => s.statuses);
  const levelNames = useSettingsStore((s) => s.levelNames);

  const draggableId = taskId
    ? `kanban-task-${epicId}-${featureId}-${taskId}`
    : `kanban-feature-${epicId}-${featureId}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      type: taskId ? 'task' : 'feature',
      epicId,
      featureId,
      taskId,
      currentStatus: item.status,
      epicName,
      epicColor,
      featureName,
    },
    disabled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const owner = item.ownerId ? users.find((u) => u.uid === item.ownerId) : undefined;
  const statusConfig = statuses.find((s) => s.value === item.status);
  const isFinal = statusConfig?.isFinal ?? false;
  const delayDays = getDelayDays(item.plannedEnd, item.actualEnd, isFinal);
  const isOverdue = delayDays > 0 && !isFinal;

  const leftBorderColor = isOverdue
    ? 'var(--destructive, #ef4444)'
    : isFeatureCard
    ? (statusConfig?.color ?? 'transparent')
    : 'transparent';

  function handleClick(e: React.MouseEvent) {
    if (isDragging) return;
    e.stopPropagation();
    openItem({ epicId, featureId, taskId });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openItem({ epicId, featureId, taskId });
    }
  }

  const breadcrumb = isFeatureCard ? epicName : `${epicName} › ${featureName}`;

  const dueDateDisplay = item.plannedEnd
    ? fmt.dateTime(new Date(item.plannedEnd), { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: leftBorderColor }}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group bg-card border border-l-[3px] rounded-lg p-2.5 cursor-pointer select-none',
        'hover:border-border hover:shadow-sm transition-all',
        isFeatureCard ? 'border-dashed border-border/80' : 'border-border/50',
        isDragging && 'opacity-40 shadow-lg'
      )}
    >
      {/* Top row: status badge + feature label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusBadge status={item.status} className="text-[9px] px-1 py-px" />
        {isFeatureCard && (
          <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide border border-border/50 rounded px-1 py-px">
            {t('featureBadge', { featureLabel: levelNames.feature })}
          </span>
        )}
      </div>

      {/* Item name */}
      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mb-1.5">
        {item.name}
      </p>

      {/* Breadcrumb context — hidden in compact mode (shown in swim lane header instead) */}
      {!compact && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 mb-2 min-w-0">
              {epicColor && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: epicColor }}
                />
              )}
              <span className="text-[10px] text-muted-foreground truncate">
                {breadcrumb}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {breadcrumb}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Footer: due date + completion + owner */}
      <div className="flex items-center gap-2 mt-auto">
        {dueDateDisplay && (
          <div
            className={cn(
              'flex items-center gap-0.5 text-[10px] shrink-0',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            <CalendarDays size={10} />
            <span>
              {isOverdue ? t('overdueShort', { days: delayDays }) : dueDateDisplay}
            </span>
          </div>
        )}

        <div className="flex-1 flex items-center gap-1 min-w-0">
          <div className="flex-1 h-1 bg-accent/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${item.completionPct}%` }}
            />
          </div>
          {item.completionPct > 0 && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {item.completionPct}%
            </span>
          )}
        </div>

        <OwnerAvatar name={owner?.name} color={owner?.color} size={20} />
      </div>
    </div>
  );
}

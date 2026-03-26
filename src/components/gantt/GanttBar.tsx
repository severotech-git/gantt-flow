'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getDelayDays, countDays, snapToWorkday } from '@/lib/dateUtils';
import { differenceInCalendarDays, parseISO, isValid, addDays } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

export interface GanttBarData {
  id: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  level: 'epic' | 'feature' | 'task';
  status: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  label: string;
  pct: number;
  ownerId?: string;
  hasWarning?: boolean;
}

interface GanttBarProps extends GanttBarData {
  left: number;
  width: number;
  readonly: boolean;
  isOverlay?: boolean;
  dragDelta?: { id: string; x: number } | null;
  pxPerDay?: number;
  allowWeekends?: boolean;
  justDragged?: boolean;
  onOpenDetail?: () => void;
}

// Level-specific bar heights (px)
const BAR_H: Record<GanttBarData['level'], number> = {
  epic:    26,
  feature: 22,
  task:    18,
};

const ROW_H = 36;

function useFmtDate() {
  const fmt = useFormatter();
  return (iso: string | undefined): string => {
    if (!iso) return '—';
    const d = parseISO(iso);
    return isValid(d) ? fmt.dateTime(d, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  };
}

export function GanttBar({
  id,
  level,
  status,
  plannedStart,
  plannedEnd,
  actualStart,
  actualEnd,
  label,
  pct,
  left,
  width,
  readonly,
  isOverlay = false,
  ownerId,
  dragDelta,
  hasWarning,
  pxPerDay = 28,
  allowWeekends = true,
  justDragged = false,
  onOpenDetail,
}: GanttBarProps) {
  const t = useTranslations('gantt.bar');
  const fmt = useFormatter();
  const statuses = useSettingsStore((s) => s.statuses);
  const users = useSettingsStore((s) => s.users);
  const ownerUser = users.find((u) => u.uid === ownerId);
  const fmtDate = useFmtDate();
  const statusConfig = statuses.find((s) => s.value === status);
  const barColorHex = statusConfig?.color ?? '#64748b';
  const isFinal = statusConfig?.isFinal ?? false;

  // Move logic
  const {
    attributes: moveAttrs,
    listeners: moveListeners,
    setNodeRef: setMoveRef,
    transform,
    isDragging: isMoving
  } = useDraggable({
    id,
    disabled: readonly || isOverlay,
    data: { plannedStart, plannedEnd, level, type: 'move' },
  });

  const delayDays = getDelayDays(plannedEnd, actualEnd, isFinal);
  const isDelayed = delayDays > 0 && !isFinal;
  const isEarly = delayDays < 0 && isFinal;
  const durationDays = differenceInCalendarDays(parseISO(plannedEnd), parseISO(plannedStart)) + 1;

  // ── Live Preview Logic ──
  let finalLeft = left;
  let finalWidth = width;
  let finalTransform = transform ? CSS.Translate.toString(transform) : undefined;
  let isResizing = false;
  const isResizingLeft = dragDelta?.id === `resize-left:${id}`;
  const isResizingRight = dragDelta?.id === `resize-right:${id}`;

  // Compute live dates for drag tooltip (move or resize)
  let liveStart = parseISO(plannedStart);
  let liveEnd = parseISO(plannedEnd);
  if (isResizingLeft && dragDelta) {
    const raw = addDays(liveStart, Math.round(dragDelta.x / pxPerDay));
    liveStart = allowWeekends ? raw : snapToWorkday(raw, 'forward');
  } else if (isResizingRight && dragDelta) {
    const raw = addDays(liveEnd, Math.round(dragDelta.x / pxPerDay));
    liveEnd = allowWeekends ? raw : snapToWorkday(raw, 'backward');
  } else if (isMoving && transform) {
    const deltaDays = Math.round(transform.x / pxPerDay);
    const rawStart = addDays(liveStart, deltaDays);
    const rawEnd = addDays(liveEnd, deltaDays);
    liveStart = allowWeekends ? rawStart : snapToWorkday(rawStart, 'forward');
    liveEnd = allowWeekends ? rawEnd : snapToWorkday(rawEnd, 'backward');
  }
  const showTooltip = (isResizingLeft || isResizingRight || isMoving);
  const liveDayCount = showTooltip ? countDays(liveStart, liveEnd, allowWeekends) : 0;

  const fmtShort = (d: Date) =>
    isValid(d) ? fmt.dateTime(d, { month: 'short', day: 'numeric' }) : '—';

  if (dragDelta) {
    if (isResizingLeft) {
      isResizing = true;
      finalLeft = left + Math.min(dragDelta.x, width - 8);
      finalWidth = Math.max(width - dragDelta.x, 8);
      finalTransform = undefined;
    } else if (isResizingRight) {
      isResizing = true;
      finalWidth = Math.max(width + dragDelta.x, 8);
      finalTransform = undefined;
    }
  }

  const style: React.CSSProperties = {
    left: `${finalLeft}px`,
    width: `${finalWidth}px`,
    height: `${BAR_H[level]}px`,
    top: `${(ROW_H - BAR_H[level]) / 2}px`,
    transform: finalTransform,
    zIndex: isMoving || isResizing ? 100 : 'auto',
    outline: isResizing ? '2px solid #6366f1' : 'none',
    boxShadow: isResizing ? '0 0 15px rgba(99, 102, 241, 0.5)' : undefined,
  };

  const resolvedColor = isDelayed ? '#ef4444' : barColorHex;

  const barEl = (
    <div
      style={{ ...style, backgroundColor: resolvedColor }}
      className={cn(
        'absolute rounded flex items-center select-none group transition-shadow',
        isMoving && !isOverlay && 'opacity-50',
        isDelayed && !isOverlay && 'overdue-glow',
        isOverlay && 'shadow-xl shadow-black/50 ring-1 ring-white/20 opacity-90',
        level === 'epic' && 'rounded-sm',
      )}
    >
      <div
        ref={isOverlay ? undefined : setMoveRef}
        {...(isOverlay ? {} : { ...moveAttrs, ...moveListeners })}
        onClick={(e) => {
          if (justDragged) return;
          e.stopPropagation();
          onOpenDetail?.();
        }}
        className={cn(
          "absolute inset-0 flex items-center overflow-hidden rounded",
          !isOverlay && !readonly && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {pct > 0 && (
          <div
            className={cn('absolute inset-y-0 left-0 rounded-l', pct >= 100 && 'rounded', 'bg-white/20')}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        )}

        {finalWidth > 44 && (
          <span className="relative px-2 text-[10px] font-semibold text-white/90 truncate leading-none pointer-events-none whitespace-nowrap flex items-center gap-1">
            {hasWarning && !isOverlay && <AlertTriangle size={10} className="shrink-0 text-amber-400" />}
            {isDelayed && <span className="opacity-90">⚠</span>}
            {label}
          </span>
        )}

        {actualEnd && actualEnd !== plannedEnd && isFinal && (() => {
          const diffDays = differenceInCalendarDays(parseISO(actualEnd), parseISO(plannedStart));
          const tickLeft = Math.min(Math.max((diffDays / durationDays) * 100, 0), 100);
          return <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10 pointer-events-none" style={{ left: `${tickLeft}%` }} />;
        })()}
      </div>

      {/* Diff label — shown to the left of the bar */}
      {!isOverlay && isDelayed && (
        <div className="absolute right-full top-1/2 -translate-y-1/2 pr-1.5 text-[10px] font-semibold whitespace-nowrap pointer-events-none text-red-400">
          +{delayDays}d
        </div>
      )}

      {/* Drag tooltip (move or resize) */}
      {showTooltip && !isOverlay && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-popover border border-border text-popover-foreground text-[11px] font-medium px-2 py-0.5 rounded shadow-lg pointer-events-none z-50 flex items-center gap-1.5">
          <span>{fmtShort(liveStart)}</span>
          <span className="opacity-40">·</span>
          <span>{fmtShort(liveEnd)}</span>
          <span className="opacity-40">·</span>
          <span className="tabular-nums">{liveDayCount}d</span>
        </div>
      )}

      {!isOverlay && !readonly && (
        <>
          <ResizeHandle barId={id} side="left" />
          <ResizeHandle barId={id} side="right" />
        </>
      )}
    </div>
  );

  if (isOverlay) return barEl;

  const diffLabel = isDelayed
    ? t('overdue', { days: delayDays })
    : isEarly
    ? t('early', { days: Math.abs(delayDays) })
    : t('onSchedule');

  return (
    <Tooltip>
      <TooltipTrigger asChild>{barEl}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-popover border-border text-popover-foreground text-xs p-3 max-w-[220px] space-y-1.5"
      >
        <p className="font-semibold text-foreground">{label}</p>
        {ownerUser && <p className="text-muted-foreground text-[11px]">{t('owner')}: {ownerUser.name}</p>}
        <div className="border-t border-border pt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-muted-foreground">{t('plannedStart')}</span>
          <span>{fmtDate(plannedStart)}</span>
          <span className="text-muted-foreground">{t('plannedEnd')}</span>
          <span>{fmtDate(plannedEnd)}</span>
          {actualStart && (
            <>
              <span className="text-muted-foreground">{t('actualStart')}</span>
              <span>{fmtDate(actualStart)}</span>
            </>
          )}
          {actualEnd && (
            <>
              <span className="text-muted-foreground">{t('actualEnd')}</span>
              <span>{fmtDate(actualEnd)}</span>
            </>
          )}
          <span className="text-muted-foreground">{t('duration')}</span>
          <span>{durationDays}d</span>
          <span className="text-muted-foreground">{t('progress')}</span>
          <span>{pct}%</span>
        </div>
        <p className={cn(
          'text-[11px] font-medium pt-0.5',
          isDelayed ? 'text-red-400' : isEarly ? 'text-emerald-400' : 'text-muted-foreground'
        )}>
          {diffLabel}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function ResizeHandle({ barId, side }: { barId: string; side: 'left' | 'right' }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `resize-${side}:${barId}`,
    data: { type: 'resize', side, barId },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'absolute top-0 bottom-0 z-30 flex items-center justify-center cursor-ew-resize w-4',
        side === 'left' ? '-left-2' : '-right-2',
      )}
    >
      <div className={cn(
        'w-1.5 h-1/2 rounded-full bg-white/50 transition-opacity',
        isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )} />
    </div>
  );
}

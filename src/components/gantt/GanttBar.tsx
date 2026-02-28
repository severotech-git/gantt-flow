'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getDelayDays } from '@/lib/dateUtils';
import { differenceInCalendarDays, parseISO, format, isValid } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';

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
}

// Level-specific bar heights (px)
const BAR_H: Record<GanttBarData['level'], number> = {
  epic:    26,
  feature: 22,
  task:    18,
};

const ROW_H = 36;

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—';
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
}: GanttBarProps) {
  const statuses = useSettingsStore((s) => s.statuses);
  const users = useSettingsStore((s) => s.users);
  const ownerUser = users.find((u) => u.uid === ownerId);
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

  const delayDays = getDelayDays(plannedEnd, actualEnd);
  const isDelayed = delayDays > 0 && !isFinal;
  const isEarly = delayDays < 0 && (status === 'done');
  const durationDays = differenceInCalendarDays(parseISO(plannedEnd), parseISO(plannedStart)) + 1;

  // ── Live Preview Logic ──
  let finalLeft = left;
  let finalWidth = width;
  let finalTransform = transform ? CSS.Translate.toString(transform) : undefined;
  let isResizing = false;

  if (dragDelta) {
    if (dragDelta.id === `resize-left:${id}`) {
      isResizing = true;
      finalLeft = left + Math.min(dragDelta.x, width - 8);
      finalWidth = Math.max(width - dragDelta.x, 8);
      finalTransform = undefined;
    } else if (dragDelta.id === `resize-right:${id}`) {
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

        {actualEnd && actualEnd !== plannedEnd && status === 'done' && (() => {
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
    ? `${delayDays}d overdue`
    : isEarly
    ? `${Math.abs(delayDays)}d early`
    : 'On schedule';

  return (
    <Tooltip>
      <TooltipTrigger asChild>{barEl}</TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-[#1e2533] border-white/10 text-slate-200 text-xs p-3 max-w-[220px] space-y-1.5"
      >
        <p className="font-semibold text-white">{label}</p>
        {ownerUser && <p className="text-slate-400 text-[11px]">Owner: {ownerUser.name}</p>}
        <div className="border-t border-white/10 pt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <span className="text-slate-500">Planned start</span>
          <span>{fmtDate(plannedStart)}</span>
          <span className="text-slate-500">Planned end</span>
          <span>{fmtDate(plannedEnd)}</span>
          {actualStart && (
            <>
              <span className="text-slate-500">Actual start</span>
              <span>{fmtDate(actualStart)}</span>
            </>
          )}
          {actualEnd && (
            <>
              <span className="text-slate-500">Actual end</span>
              <span>{fmtDate(actualEnd)}</span>
            </>
          )}
          <span className="text-slate-500">Duration</span>
          <span>{durationDays}d</span>
          <span className="text-slate-500">Progress</span>
          <span>{pct}%</span>
        </div>
        <p className={cn(
          'text-[11px] font-medium pt-0.5',
          isDelayed ? 'text-red-400' : isEarly ? 'text-emerald-400' : 'text-slate-400'
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

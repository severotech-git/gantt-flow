'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { StatusType } from '@/types';
import { getBarColor } from '@/components/shared/StatusBadge';
import { getDelayDays } from '@/lib/dateUtils';
import { differenceInCalendarDays, parseISO, format, isValid } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GanttBarData {
  id: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  level: 'epic' | 'feature' | 'task';
  status: StatusType;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  label: string;
  pct: number;
  ownerName?: string;
}

interface GanttBarProps extends GanttBarData {
  left: number;
  width: number;
  readonly: boolean;
  isOverlay?: boolean;
}

// Level-specific bar heights (px)
const BAR_H: Record<GanttBarData['level'], number> = {
  epic:    26,
  feature: 22,
  task:    18,
};

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
  ownerName,
}: GanttBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: readonly || isOverlay,
    data: { plannedStart, plannedEnd, level },
  });

  const delayDays = getDelayDays(plannedEnd, actualEnd);
  const isDelayed = delayDays > 0 && status !== 'done' && status !== 'canceled';
  const isEarly = delayDays < 0 && (status === 'done');
  const durationDays = differenceInCalendarDays(parseISO(plannedEnd), parseISO(plannedStart)) + 1;

  const style: React.CSSProperties = {
    left,
    width: Math.max(width, 8),
    height: BAR_H[level],
    transform: isOverlay
      ? undefined
      : transform
      ? CSS.Transform.toString({ ...transform, y: 0, scaleX: 1, scaleY: 1 })
      : undefined,
    zIndex: isDragging ? 50 : 'auto',
  };

  const barColor = isDelayed
    ? 'bg-red-500'
    : status === 'done'
    ? 'bg-emerald-500'
    : getBarColor(status);

  const barEl = (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 rounded flex items-center overflow-hidden select-none group',
        !isOverlay && !readonly && 'cursor-grab active:cursor-grabbing',
        !isOverlay && 'transition-shadow',
        barColor,
        isDragging && !isOverlay && 'opacity-50',
        isDelayed && !isOverlay && 'overdue-glow',
        isOverlay && 'shadow-xl shadow-black/50 ring-1 ring-white/20 opacity-90',
        level === 'epic' && 'rounded-sm',
      )}
    >
      {/* Progress fill */}
      {pct > 0 && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-l',
            pct >= 100 ? 'rounded' : '',
            'bg-white/20'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      )}

      {/* Label — only show if bar is wide enough */}
      {width > 44 && (
        <span className="relative px-2 text-[10px] font-semibold text-white/90 truncate leading-none pointer-events-none whitespace-nowrap">
          {isDelayed && <span className="mr-1 opacity-90">⚠</span>}
          {label}
        </span>
      )}

      {/* Actual-end tick — shown when task is done and actualEnd differs from plannedEnd */}
      {actualEnd && actualEnd !== plannedEnd && status === 'done' && (() => {
        const diffDays = differenceInCalendarDays(parseISO(actualEnd), parseISO(plannedStart));
        const tickLeft = Math.min(Math.max((diffDays / durationDays) * 100, 0), 100);
        return (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10 pointer-events-none"
            style={{ left: `${tickLeft}%` }}
            title={`Actual end: ${fmtDate(actualEnd)}`}
          />
        );
      })()}

      {/* Resize handles — separate draggables on left/right edges */}
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
        {ownerName && <p className="text-slate-400 text-[11px]">Owner: {ownerName}</p>}
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

// ─── ResizeHandle ─────────────────────────────────────────────────────────────
// Separate draggable component for left/right resize edges.
// ID convention: "resize-left:<barId>" | "resize-right:<barId>"

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
        'absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-ew-resize',
        // Wide enough touch target, but visually thin
        side === 'left' ? 'left-0 pl-px' : 'right-0 pr-px',
        'w-3',
      )}
      // Prevent the bar's own drag listeners from firing when the handle is grabbed
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Visual indicator: appears on hover / active drag */}
      <div className={cn(
        'w-0.5 h-3/4 rounded-full bg-white/50 transition-opacity',
        isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
      )} />
    </div>
  );
}

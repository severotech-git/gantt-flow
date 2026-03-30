'use client';

import { usePresenceStore } from '@/store/usePresenceStore';
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns';

const ROW_H = 36;

const BAR_H: Record<string, number> = {
  epic: 26,
  feature: 22,
  task: 18,
};

function toDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

interface RemoteDragGhostsProps {
  visibleRows: Array<{
    rowKey: string;
    bar?: { id: string; plannedStart: string; plannedEnd: string; level: string };
  }>;
  pxPerDay: number;
  timelineStartDate: Date;
}

/**
 * Renders semi-transparent ghost bars for remote users' active drags.
 * Positioned absolutely within the rows container of GanttTimeline.
 */
export function RemoteDragGhosts({
  visibleRows,
  pxPerDay,
  timelineStartDate,
}: RemoteDragGhostsProps) {
  const remoteDrags = usePresenceStore((s) => s.remoteDrags);
  const connectedUsers = usePresenceStore((s) => s.connectedUsers);

  if (remoteDrags.size === 0) return null;

  return (
    <>
      {[...remoteDrags.entries()].map(([userId, drag]) => {
        const user = connectedUsers.find((u) => u.userId === userId);
        if (!user) return null;

        // Parse dragId to find the target bar
        const isResize = drag.dragId.startsWith('resize-');
        const isResizeRight = drag.dragId.startsWith('resize-right:');
        const barId = isResize
          ? drag.dragId.slice(drag.dragId.indexOf(':') + 1)
          : drag.dragId;

        // Find which row this bar belongs to
        const rowIndex = visibleRows.findIndex((r) => r.bar?.id === barId);
        if (rowIndex === -1) return null;

        // Compute bar position from barData (original position at drag start)
        const start = toDate(drag.barData.plannedStart);
        const end = toDate(drag.barData.plannedEnd);
        if (!start || !end) return null;

        const originalLeft = Math.max(differenceInCalendarDays(start, timelineStartDate) * pxPerDay, 0);
        const originalWidth = Math.max((differenceInCalendarDays(end, start) + 1) * pxPerDay, pxPerDay);
        const barH = BAR_H[drag.barData.level] ?? 18;
        const topInRow = (ROW_H - barH) / 2;
        const top = rowIndex * ROW_H + topInRow;

        // Scale deltaX from remote zoom to local zoom
        const scale = drag.remotePxPerDay > 0 ? pxPerDay / drag.remotePxPerDay : 1;
        const scaledDeltaX = drag.deltaX * scale;

        let ghostLeft = originalLeft;
        let ghostWidth = originalWidth;

        if (isResize) {
          if (isResizeRight) {
            ghostWidth = Math.max(originalWidth + scaledDeltaX, 8);
          } else {
            // resize-left
            ghostLeft = originalLeft + Math.min(scaledDeltaX, originalWidth - 8);
            ghostWidth = Math.max(originalWidth - scaledDeltaX, 8);
          }
        } else {
          // move
          ghostLeft = originalLeft + scaledDeltaX;
        }

        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-[15]"
            style={{
              left: ghostLeft,
              top,
              width: ghostWidth,
              height: barH,
              backgroundColor: user.color,
              opacity: 0.35,
              borderRadius: 4,
              border: `2px solid ${user.color}`,
              transition: 'left 60ms linear, width 60ms linear',
            }}
          >
            {/* User name badge */}
            <span
              className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-2xs font-medium text-white shadow-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

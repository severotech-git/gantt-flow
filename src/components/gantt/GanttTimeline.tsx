'use client';

import { useRef, forwardRef, useImperativeHandle, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { GanttBar } from './GanttBar';
import { differenceInCalendarDays, parseISO, isValid, addDays, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFormatter, type DateTimeFormatOptions } from 'next-intl';
import { RemoteCursors } from './RemoteCursors';
import { RemoteDragGhosts } from './RemoteDragGhost';
import { getSocket } from '@/lib/socket';
import { usePresenceStore } from '@/store/usePresenceStore';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';

const PX_PER_DAY: Record<string, number> = {
  week:    28,
  month:   10,
  quarter:  4,
};

// Subtle per-epic group accent colors (rotate through palette)
const EPIC_COLORS = [
  'rgba(59,130,246,0.40)',   // blue
  'rgba(139,92,246,0.40)',   // violet
  'rgba(16,185,129,0.40)',   // emerald
  'rgba(245,158,11,0.40)',   // amber
  'rgba(244,63,94,0.40)',    // rose
  'rgba(6,182,212,0.40)',    // cyan
];

// Days added per infinite-scroll extension
const CHUNK = 90;
// Pixels from edge that trigger an extension
const THRESHOLD_PX = 400;

const ROW_H = 36;

import { VisibleRow } from './GanttTaskPanel';

interface GanttTimelineProps {
  visibleRows: VisibleRow[];
  onScrollY: (scrollTop: number) => void;
  dragDelta: { id: string; x: number } | null;
  justDragged?: boolean;
}

export interface GanttTimelineHandle {
  scrollTo: (top: number) => void;
}

function toDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface HeaderGroup { label: string; days: number }

type FmtDate = (date: Date, opts: DateTimeFormatOptions) => string;

function buildHeader(scale: string, timelineStart: Date, totalDays: number, fmtDate: FmtDate) {
  const today = new Date();
  const groups: HeaderGroup[] = [];
  const dayLabels: Array<{ label: string; isToday: boolean; isWeekend: boolean }> = [];

  for (let d = 0; d < totalDays; d++) {
    const date = addDays(timelineStart, d);
    const isToday = differenceInCalendarDays(date, today) === 0;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    dayLabels.push({ label: fmtDate(date, { weekday: 'narrow' }), isToday, isWeekend });
  }

  let cursor = 0;
  while (cursor < totalDays) {
    const date = addDays(timelineStart, cursor);
    if (scale === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const label = `${fmtDate(weekStart, { month: 'short', day: 'numeric' })} - ${fmtDate(weekEnd, { month: 'short', day: 'numeric' })}`;
      const days = Math.min(7, totalDays - cursor);
      groups.push({ label, days });
      cursor += days;
    } else if (scale === 'month') {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const days = Math.min(differenceInCalendarDays(monthEnd, date) + 1, totalDays - cursor);
      groups.push({ label: fmtDate(date, { month: 'long', year: 'numeric' }), days });
      cursor += days;
    } else {
      const qMonth = Math.floor(date.getMonth() / 3) * 3;
      const qEnd = new Date(date.getFullYear(), qMonth + 3, 0);
      const days = Math.min(differenceInCalendarDays(qEnd, date) + 1, totalDays - cursor);
      groups.push({ label: `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`, days });
      cursor += days;
    }
  }
  return { groups, dayLabels };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GanttTimeline = forwardRef<GanttTimelineHandle, GanttTimelineProps>(
  function GanttTimeline({ visibleRows, onScrollY, dragDelta, justDragged }, ref) {
    const { timelineScale, timelineStartDate: storeStartDate, isVersionReadOnly, focusedBarId, setFocusedBarId, zoomLevel, timelineScrollTarget, clearTimelineScrollTarget, openItem } = useProjectStore();
    const allowWeekends = useSettingsStore((s) => s.allowWeekends);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fmt = useFormatter();
    const fmtDate: FmtDate = (date, opts) => fmt.dateTime(date, opts);

    const pxPerDay = PX_PER_DAY[timelineScale] * zoomLevel;

    // ── Remote cursor tracking ──────────────────────────────────────────────
    const currentProjectId = usePresenceStore((s) => s.currentProjectId);

    const sendCursorThrottled = useThrottledCallback(
      (x: number, y: number, scrollLeft: number, scrollTop: number) => {
        if (!currentProjectId) return;
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('cursor-move', { projectId: currentProjectId, x, y, pxPerDay, scrollLeft, scrollTop });
        }
      },
      33, // ~30fps
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollRef.current) return;
        const rect = scrollRef.current.getBoundingClientRect();
        // Position relative to the scrollable content (not viewport)
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft;
        const y = e.clientY - rect.top + scrollRef.current.scrollTop;
        sendCursorThrottled(x, y, scrollRef.current.scrollLeft, scrollRef.current.scrollTop);
      },
      [sendCursorThrottled],
    );

    const handleMouseLeave = useCallback(() => {
      if (!currentProjectId) return;
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('cursor-hide', { projectId: currentProjectId });
      }
    }, [currentProjectId]);

    // Local timeline state — independent from store so infinite scroll doesn't
    // clash with the store's "reset on Today/scale" effect.
    function initialTotalDays(ppd: number) {
      return Math.ceil(1400 / ppd) + CHUNK;
    }
    const [localStartDate, setLocalStartDate] = useState(storeStartDate);
    const [localTotalDays, setLocalTotalDays] = useState(() => initialTotalDays(pxPerDay));

    // Tracks how many pixels we need to add to scrollLeft after a left-extension render
    const pendingScrollAdjust = useRef(0);

    // Per-row: which epic color index + whether it's the first row of a new epic group
    const rowGroupMeta = useMemo(() => {
      let epicIdx = -1;
      let lastEpicId = '';
      const map = new Map<string, { colorIdx: number; isNotFirstEpic: boolean }>();
      for (const row of visibleRows) {
        if (row.level === 'epic' && row.epicId !== lastEpicId) {
          epicIdx++;
          lastEpicId = row.epicId;
          map.set(row.rowKey, { colorIdx: epicIdx, isNotFirstEpic: epicIdx > 0 });
        } else {
          map.set(row.rowKey, { colorIdx: Math.max(epicIdx, 0), isNotFirstEpic: false });
        }
      }
      return map;
    }, [visibleRows]);

    // When store resets the origin (project load, Today button, scale switch) → reset local state
    useEffect(() => {
      setLocalStartDate(storeStartDate);
      setLocalTotalDays(initialTotalDays(PX_PER_DAY[timelineScale]));
      pendingScrollAdjust.current = 0;
      if (scrollRef.current && timelineScrollTarget === null) {
        // No scroll target — reset to left edge (e.g. manual setTimelineStartDate)
        scrollRef.current.scrollLeft = 0;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeStartDate, timelineScale]);

    // Apply scroll-to-today target synchronously after DOM update so the browser
    // doesn't clamp scrollLeft before the canvas width is committed.
    useLayoutEffect(() => {
      if (timelineScrollTarget === null || !scrollRef.current) return;
      scrollRef.current.scrollLeft = timelineScrollTarget;
      clearTimelineScrollTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timelineScrollTarget]);

    // When zoom changes, ensure canvas has enough days (zooming out needs more days)
    useEffect(() => {
      setLocalTotalDays((d) => Math.max(d, initialTotalDays(pxPerDay)));

    }, [pxPerDay]);

    // Apply scroll compensation for left extensions — must run before paint
    useLayoutEffect(() => {
      if (pendingScrollAdjust.current !== 0 && scrollRef.current) {
        scrollRef.current.scrollLeft += pendingScrollAdjust.current;
        pendingScrollAdjust.current = 0;
      }
    });

    // Scroll vertically to a focused bar (triggered by search navigation)
    useEffect(() => {
      if (!focusedBarId || !scrollRef.current) return;
      const rowIdx = visibleRows.findIndex((r) => r.bar?.id === focusedBarId);
      if (rowIdx === -1) return;
      scrollRef.current.scrollTop = Math.max(rowIdx * ROW_H - ROW_H * 2, 0);
      setFocusedBarId(null);
    }, [focusedBarId, visibleRows, setFocusedBarId]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      onScrollY(el.scrollTop);

      const { scrollLeft, scrollWidth, clientWidth } = el;

      // Near right edge → grow canvas to the right
      if (scrollLeft + clientWidth > scrollWidth - THRESHOLD_PX) {
        setLocalTotalDays((d) => d + CHUNK);
      }

      // Near left edge → shift origin backward and compensate scroll
      if (scrollLeft < THRESHOLD_PX) {
        pendingScrollAdjust.current = CHUNK * pxPerDay;
        setLocalStartDate((d) => addDays(d, -CHUNK));
        setLocalTotalDays((d) => d + CHUNK);
      }
    }, [onScrollY, pxPerDay]);

    useImperativeHandle(ref, () => ({
      scrollTo: (top: number) => { if (scrollRef.current) scrollRef.current.scrollTop = top; },
    }));

    const totalWidth = localTotalDays * pxPerDay;
    const today = new Date();
    const todayOffset = differenceInCalendarDays(today, localStartDate) * pxPerDay;

    const { groups, dayLabels } = buildHeader(timelineScale, localStartDate, localTotalDays, fmtDate);
    const HEADER_H = groups ? 48 : 32;

    function barLeft(start: string) {
      const d = toDate(start);
      if (!d) return 0;
      return Math.max(differenceInCalendarDays(d, localStartDate) * pxPerDay, 0);
    }
    function barWidth(start: string, end: string) {
      const s = toDate(start);
      const e = toDate(end);
      if (!s || !e) return pxPerDay;
      return Math.max((differenceInCalendarDays(e, s) + 1) * pxPerDay, pxPerDay);
    }

    return (
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto relative gantt-scroll"
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>

          {/* ── Header ──────────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 border-b border-border bg-surface-2"
            style={{ height: HEADER_H }}
          >
            {groups && (
              <div className="flex absolute top-0 left-0 right-0 h-6 border-b border-border/50">
                {groups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: g.days * pxPerDay, minWidth: g.days * pxPerDay }}
                    className="shrink-0 flex items-center justify-center text-[11px] font-medium text-muted-foreground border-r border-border/50 truncate px-2"
                  >
                    {g.label}
                  </div>
                ))}
              </div>
            )}

            <div
              className="flex absolute left-0"
              style={{ top: groups ? 24 : 0, height: groups ? 24 : 32 }}
            >
              {dayLabels.map((d, i) => (
                <div
                  key={i}
                  style={{ width: pxPerDay, minWidth: pxPerDay }}
                  className={cn(
                    'shrink-0 flex items-center justify-center text-2xs font-medium border-r border-border/40',
                    d.isToday
                      ? 'text-blue-500 bg-blue-500/10'
                      : d.isWeekend
                      ? 'text-muted-foreground/50 bg-[var(--weekend-bg)]'
                      : 'text-muted-foreground/70'
                  )}
                >
                  {pxPerDay >= 16 ? d.label : ''}
                </div>
              ))}
            </div>
          </div>

          {/* ── Rows ────────────────────────────────────────── */}
          <div style={{ position: 'relative' }}>
            {visibleRows.map((row) => {
              const meta = rowGroupMeta.get(row.rowKey);
              const groupColor = EPIC_COLORS[(meta?.colorIdx ?? 0) % EPIC_COLORS.length];
              const isNotFirstEpic = meta?.isNotFirstEpic ?? false;

              return (
              <div
                key={row.rowKey}
                className={cn(
                  'relative border-b border-border/40',
                  !row.isAddRow && row.level === 'epic' && 'bg-[var(--row-alt)]',
                  row.isAddRow && 'bg-transparent',
                  isNotFirstEpic && 'border-t-2 border-t-border/60',
                )}
                style={{ height: ROW_H }}
              >
                {/* Column grid + weekend shading */}
                {dayLabels.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute top-0 bottom-0',
                      d.isWeekend && 'bg-[var(--weekend-bg)]',
                      'border-r border-border/30',
                    )}
                    style={{ left: i * pxPerDay, width: pxPerDay }}
                  />
                ))}

                {/* Epic group left accent stripe */}
                {!row.isAddRow && (
                  <div
                    className="absolute left-0 top-0 bottom-0 z-[5] pointer-events-none"
                    style={{
                      width: row.level === 'epic' ? 3 : 2,
                      backgroundColor: groupColor,
                    }}
                  />
                )}

                {/* Bar — skip for add-rows */}
                {!row.isAddRow && row.bar && (
                  <GanttBar
                    {...row.bar}
                    left={barLeft(row.bar.plannedStart)}
                    width={barWidth(row.bar.plannedStart, row.bar.plannedEnd)}
                    readonly={isVersionReadOnly}
                    dragDelta={(dragDelta?.id === row.bar.id || dragDelta?.id.endsWith(`:${row.bar.id}`)) ? dragDelta : null}
                    pxPerDay={pxPerDay}
                    allowWeekends={allowWeekends}
                    justDragged={justDragged}
                    onOpenDetail={() => openItem({
                      epicId: row.bar?.epicId || '',
                      featureId: row.bar?.featureId,
                      taskId: row.bar?.taskId,
                    })}
                  />
                )}
              </div>
              );
            })}

            {/* Empty state rows placeholder */}
            {visibleRows.length === 0 && (
              <div className="flex items-center justify-center h-24 text-muted-foreground/50 text-xs">
                No items to display
              </div>
            )}

            {/* Remote drag ghost bars */}
            <RemoteDragGhosts
              visibleRows={visibleRows}
              pxPerDay={pxPerDay}
              timelineStartDate={localStartDate}
            />
          </div>

          {/* ── Today marker ─────────────────────────────────── */}
          {todayOffset >= 0 && todayOffset <= totalWidth && (
            <>
              {/* Full-height line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10 pointer-events-none today-pulse"
                style={{ left: todayOffset }}
              />
              {/* Diamond cap at top */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{ left: todayOffset - 4, top: HEADER_H - 8 }}
              >
                <div className="w-2 h-2 bg-blue-500 rotate-45 rounded-sm" />
              </div>
            </>
          )}

          {/* ── Remote cursors overlay ────────────────────── */}
          <RemoteCursors localPxPerDay={pxPerDay} />
        </div>
      </div>
    );
  }
);

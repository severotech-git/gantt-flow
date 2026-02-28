'use client';

import { useRef, forwardRef, useImperativeHandle, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { GanttBar, GanttBarData } from './GanttBar';
import { differenceInCalendarDays, parseISO, isValid, addDays, startOfWeek, format } from 'date-fns';
import { cn } from '@/lib/utils';

const PX_PER_DAY: Record<string, number> = {
  week:    28,
  month:   10,
  quarter:  4,
};

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

function buildHeader(scale: string, timelineStart: Date, totalDays: number) {
  const today = new Date();
  const groups: HeaderGroup[] = [];
  const dayLabels: Array<{ label: string; isToday: boolean; isWeekend: boolean }> = [];

  for (let d = 0; d < totalDays; d++) {
    const date = addDays(timelineStart, d);
    const isToday = differenceInCalendarDays(date, today) === 0;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    dayLabels.push({ label: format(date, 'EEEEE'), isToday, isWeekend });
  }

  let cursor = 0;
  while (cursor < totalDays) {
    const date = addDays(timelineStart, cursor);
    if (scale === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const label = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
      const days = Math.min(7, totalDays - cursor);
      groups.push({ label, days });
      cursor += days;
    } else if (scale === 'month') {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const days = Math.min(differenceInCalendarDays(monthEnd, date) + 1, totalDays - cursor);
      groups.push({ label: format(date, 'MMMM yyyy'), days });
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
  function GanttTimeline({ visibleRows, onScrollY, dragDelta }, ref) {
    const { timelineScale, timelineStartDate: storeStartDate, isVersionReadOnly, focusedBarId, setFocusedBarId } = useProjectStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    const pxPerDay = PX_PER_DAY[timelineScale];

    // Local timeline state — independent from store so infinite scroll doesn't
    // clash with the store's "reset on Today/scale" effect.
    function initialTotalDays(ppd: number) {
      return Math.ceil(1400 / ppd) + CHUNK;
    }
    const [localStartDate, setLocalStartDate] = useState(storeStartDate);
    const [localTotalDays, setLocalTotalDays] = useState(() => initialTotalDays(pxPerDay));

    // Tracks how many pixels we need to add to scrollLeft after a left-extension render
    const pendingScrollAdjust = useRef(0);

    // When store resets the origin (Today button, scale switch, search nav) → reset local state
    useEffect(() => {
      setLocalStartDate(storeStartDate);
      setLocalTotalDays(initialTotalDays(PX_PER_DAY[timelineScale]));
      pendingScrollAdjust.current = 0;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeStartDate, timelineScale]);

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

    const { groups, dayLabels } = buildHeader(timelineScale, localStartDate, localTotalDays);
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
      >
        <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>

          {/* ── Header ──────────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0d1117]"
            style={{ height: HEADER_H }}
          >
            {groups && (
              <div className="flex absolute top-0 left-0 right-0 h-6 border-b border-white/[0.05]">
                {groups.map((g, i) => (
                  <div
                    key={i}
                    style={{ width: g.days * pxPerDay, minWidth: g.days * pxPerDay }}
                    className="shrink-0 flex items-center justify-center text-[11px] font-medium text-slate-400 border-r border-white/[0.05] truncate px-2"
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
                    'shrink-0 flex items-center justify-center text-[10px] font-medium border-r border-white/[0.04]',
                    d.isToday
                      ? 'text-blue-400 bg-blue-500/10'
                      : d.isWeekend
                      ? 'text-slate-600 bg-white/[0.015]'
                      : 'text-slate-500'
                  )}
                >
                  {pxPerDay >= 16 ? d.label : ''}
                </div>
              ))}
            </div>
          </div>

          {/* ── Rows ────────────────────────────────────────── */}
          <div>
            {visibleRows.map((row) => (
              <div
                key={row.rowKey}
                className={cn(
                  'relative border-b border-white/[0.04]',
                  !row.isAddRow && row.level === 'epic' && 'bg-white/[0.015]',
                  row.isAddRow && 'bg-transparent',
                )}
                style={{ height: ROW_H }}
              >
                {/* Column grid + weekend shading */}
                {dayLabels.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      'absolute top-0 bottom-0',
                      d.isWeekend && 'bg-white/[0.012]',
                      'border-r border-white/[0.03]',
                    )}
                    style={{ left: i * pxPerDay, width: pxPerDay }}
                  />
                ))}

                {/* Bar — skip for add-rows */}
                {!row.isAddRow && row.bar && (
                  <GanttBar
                    {...row.bar}
                    left={barLeft(row.bar.plannedStart)}
                    width={barWidth(row.bar.plannedStart, row.bar.plannedEnd)}
                    readonly={isVersionReadOnly}
                    dragDelta={(dragDelta?.id === row.bar.id || dragDelta?.id.endsWith(`:${row.bar.id}`)) ? dragDelta : null}
                  />
                )}
              </div>
            ))}

            {/* Empty state rows placeholder */}
            {visibleRows.length === 0 && (
              <div className="flex items-center justify-center h-24 text-slate-600 text-xs">
                No items to display
              </div>
            )}
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
        </div>
      </div>
    );
  }
);

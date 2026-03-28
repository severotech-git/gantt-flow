'use client';

import { useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { differenceInCalendarDays, parseISO, isValid, addDays, startOfWeek } from 'date-fns';
import { ZoomIn, ZoomOut, ChevronRight, ChevronDown, Crosshair, Eye, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatter, useTranslations, type DateTimeFormatOptions } from 'next-intl';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { getDelayDays } from '@/lib/dateUtils';
import type { IProject, IStatusConfig, IUserConfig } from '@/types';

// ─── Constants matching the real Gantt ────────────────────────────────────────

const PX_PER_DAY_MAP: Record<string, number> = { week: 28, month: 10, quarter: 4 };
const SCALE_VALUES = ['week', 'month', 'quarter'] as const;
type Scale = typeof SCALE_VALUES[number];
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const ROW_H = 36;
const PANEL_MIN = 200;
const PANEL_MAX = 700;
const PANEL_DEFAULT = 460;
const CHUNK = 90;
const THRESHOLD_PX = 400;

const EPIC_COLORS_PANEL = [
  'rgba(59,130,246,0.50)',
  'rgba(139,92,246,0.50)',
  'rgba(16,185,129,0.50)',
  'rgba(245,158,11,0.50)',
  'rgba(244,63,94,0.50)',
  'rgba(6,182,212,0.50)',
];

const EPIC_COLORS_TIMELINE = [
  'rgba(59,130,246,0.40)',
  'rgba(139,92,246,0.40)',
  'rgba(16,185,129,0.40)',
  'rgba(245,158,11,0.40)',
  'rgba(244,63,94,0.40)',
  'rgba(6,182,212,0.40)',
];

const DEFAULT_BAR_COLOR = '#64748b';

const BAR_H: Record<string, number> = {
  epic:    10,
  feature: 22,
  task:    18,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

function stepZoom(current: number, dir: 'in' | 'out'): number {
  if (dir === 'in') return ZOOM_STEPS.find((z) => z > current + 0.01) ?? current;
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01) ?? current;
}

function countDays(start: string, end: string): number | undefined {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return undefined;
  return differenceInCalendarDays(e, s) + 1;
}

// ─── Row model ────────────────────────────────────────────────────────────────

interface FlatRow {
  rowKey: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  level: 'epic' | 'feature' | 'task';
  name: string;
  status: string;
  ownerId?: string;
  pct: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  dayCount?: number;
  color?: string;
  isExpanded?: boolean;
  epicColorIdx: number;
  isNotFirstEpic: boolean;
  isLastSibling: boolean;
  parentIsLast: boolean;
}

function buildRows(
  project: IProject,
  expandedEpics: Set<string>,
  expandedFeatures: Set<string>,
): FlatRow[] {
  const rows: FlatRow[] = [];
  let epicIdx = -1;
  project.epics.forEach((epic, eIdx) => {
    epicIdx++;
    const epicExpanded = expandedEpics.has(epic._id);
    rows.push({
      rowKey: `epic-${epic._id}`,
      epicId: epic._id,
      level: 'epic',
      name: epic.name,
      status: epic.status,
      ownerId: epic.ownerId,
      pct: epic.completionPct,
      plannedStart: epic.plannedStart,
      plannedEnd: epic.plannedEnd,
      actualStart: epic.actualStart,
      actualEnd: epic.actualEnd,
      dayCount: countDays(epic.plannedStart, epic.plannedEnd),
      color: epic.color,
      isExpanded: epicExpanded,
      epicColorIdx: epicIdx,
      isNotFirstEpic: eIdx > 0,
      isLastSibling: true,
      parentIsLast: true,
    });
    if (!epicExpanded) return;
    epic.features.forEach((feat, fIdx) => {
      const featExpanded = expandedFeatures.has(feat._id);
      const isLastFeature = fIdx === epic.features.length - 1;
      rows.push({
        rowKey: `feat-${feat._id}`,
        epicId: epic._id,
        featureId: feat._id,
        level: 'feature',
        name: feat.name,
        status: feat.status,
        ownerId: feat.ownerId,
        pct: feat.completionPct,
        plannedStart: feat.plannedStart,
        plannedEnd: feat.plannedEnd,
        actualStart: feat.actualStart,
        actualEnd: feat.actualEnd,
        dayCount: countDays(feat.plannedStart, feat.plannedEnd),
        color: feat.color,
        isExpanded: featExpanded,
        epicColorIdx: epicIdx,
        isNotFirstEpic: false,
        isLastSibling: isLastFeature,
        parentIsLast: true,
      });
      if (!featExpanded) return;
      feat.tasks.forEach((task, tIdx) => {
        rows.push({
          rowKey: `task-${task._id}`,
          epicId: epic._id,
          featureId: feat._id,
          taskId: task._id,
          level: 'task',
          name: task.name,
          status: task.status,
          ownerId: task.ownerId,
          pct: task.completionPct,
          plannedStart: task.plannedStart,
          plannedEnd: task.plannedEnd,
          actualStart: task.actualStart,
          actualEnd: task.actualEnd,
          dayCount: countDays(task.plannedStart, task.plannedEnd),
          color: task.color,
          epicColorIdx: epicIdx,
          isNotFirstEpic: false,
          isLastSibling: tIdx === feat.tasks.length - 1,
          parentIsLast: isLastFeature,
        });
      });
    });
  });
  return rows;
}

// ─── Tree connector sub-components (matching GanttTaskPanel) ────────────────

function ConnectorLine({ isLast }: { isLast: boolean }) {
  return (
    <span className="w-3 shrink-0 self-stretch relative flex-none">
      <span className={cn('absolute left-[7px] top-0 w-px bg-border/60', isLast ? 'h-1/2' : 'h-full')} />
      <span className="absolute left-[7px] right-0 top-1/2 h-px bg-border/60" />
    </span>
  );
}

function ContinuationLine({ active }: { active: boolean }) {
  return (
    <span className="w-3 shrink-0 self-stretch relative flex-none">
      {active && <span className="absolute left-[7px] inset-y-0 w-px bg-border/45" />}
    </span>
  );
}

// ─── Inline StatusBadge (no store dependency) ────────────────────────────────

function ReadonlyStatusBadge({ status, statuses }: { status: string; statuses: IStatusConfig[] }) {
  const config = statuses.find((s) => s.value === status);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
      style={{ backgroundColor: config?.color ?? '#475569' }}
    >
      {config?.label ?? status}
    </span>
  );
}

// ─── Header builder ───────────────────────────────────────────────────────────

interface HeaderGroup { label: string; days: number }

function buildHeader(
  scale: Scale,
  timelineStart: Date,
  totalDays: number,
  fmtDate: (date: Date, opts: DateTimeFormatOptions) => string,
) {
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  project: IProject;
  statuses?: IStatusConfig[];
  users?: IUserConfig[];
  expiresAt?: string | Date | null;
  mode?: 'snapshot' | 'live' | null;
  versionName?: string | null;
}

export function GanttReadonlyBoard({ project, statuses = [], users = [], expiresAt, mode, versionName }: Props) {
  const t = useTranslations('gantt');
  const tShared = useTranslations('sharedView');
  const fmt = useFormatter();
  const fmtDate = (date: Date, opts: DateTimeFormatOptions) => fmt.dateTime(date, opts);
  const fmtShort = (iso: string | undefined) => {
    if (!iso) return '—';
    const d = parseISO(iso);
    return isValid(d) ? fmt.dateTime(d, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  };

  const [scale, setScale] = useState<Scale>('month');
  const [zoomLevel, setZoomLevel] = useState(1);
  const pxPerDay = PX_PER_DAY_MAP[scale] * zoomLevel;

  // Timeline start: earliest date minus padding
  const allDates = project.epics.flatMap((e) => [
    e.plannedStart, e.plannedEnd,
    ...e.features.flatMap((f) => [f.plannedStart, f.plannedEnd,
      ...f.tasks.flatMap((tt) => [tt.plannedStart, tt.plannedEnd]),
    ]),
  ]).map(toDate).filter((d): d is Date => d !== null);

  const minDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : new Date();
  const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : addDays(new Date(), 90);
  // Start CHUNK days earlier so initial scrollLeft is well above THRESHOLD_PX (avoids
  // the backward-extension firing on any vertical scroll before user scrolls horizontally)
  const timelineStart = addDays(minDate, -14 - CHUNK);

  // Infinite scroll state
  const [localStart, setLocalStart] = useState(timelineStart);
  const [localTotalDays, setLocalTotalDays] = useState(
    Math.max(differenceInCalendarDays(maxDate, timelineStart) + 60, Math.ceil(1400 / pxPerDay) + CHUNK * 2)
  );
  const pendingScrollAdjust = useRef(0);
  // Tracks the desired scroll position after a scale change or mount
  const pendingScrollTarget = useRef<number | null>(CHUNK * PX_PER_DAY_MAP[scale]);

  const totalWidth = localTotalDays * pxPerDay;
  const today = new Date();
  const todayOffset = differenceInCalendarDays(today, localStart) * pxPerDay;

  // Timeline scroll ref
  const timelineRef = useRef<HTMLDivElement>(null);

  // On mount: restore the initial scrollLeft so today is visible and we're past the left threshold
  useLayoutEffect(() => {
    if (pendingScrollTarget.current !== null && timelineRef.current) {
      timelineRef.current.scrollLeft = pendingScrollTarget.current;
      pendingScrollTarget.current = null;
    }
  // Only run on mount
  }, []);

  // When scale changes: remember the date at the current viewport center, reset local state,
  // then scroll to that same date at the new pxPerDay
  const prevScaleRef = useRef(scale);
  useEffect(() => {
    if (prevScaleRef.current === scale) return;
    const oldScale = prevScaleRef.current;
    prevScaleRef.current = scale;
    const el = timelineRef.current;
    // Compute the date currently at the center of the viewport using the OLD scale's pxPerDay
    const centerDaysFromStart = el
      ? (el.scrollLeft + el.clientWidth / 2) / (PX_PER_DAY_MAP[oldScale] * zoomLevel)
      : CHUNK;
    const anchorDate = addDays(localStart, Math.round(centerDaysFromStart));
    // Reset local state to the original buffered start
    const newStart = addDays(minDate, -14 - CHUNK);
    const newPpd = PX_PER_DAY_MAP[scale] * zoomLevel;
    const newTotalDays = Math.max(
      differenceInCalendarDays(maxDate, newStart) + 60,
      Math.ceil(1400 / newPpd) + CHUNK * 2
    );
    setLocalStart(newStart);
    setLocalTotalDays(newTotalDays);
    // Scroll to re-center on anchorDate at the new scale
    const newScrollLeft = Math.max(0, differenceInCalendarDays(anchorDate, newStart) * newPpd - (el?.clientWidth ?? 700) / 2);
    pendingScrollTarget.current = newScrollLeft;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Apply pendingScrollTarget after state commits
  useLayoutEffect(() => {
    if (pendingScrollTarget.current !== null && timelineRef.current) {
      timelineRef.current.scrollLeft = pendingScrollTarget.current;
      pendingScrollTarget.current = null;
    }
  });

  // Jump to today
  const jumpToToday = useCallback(() => {
    if (!timelineRef.current) return;
    const offset = differenceInCalendarDays(today, localStart) * pxPerDay;
    const el = timelineRef.current;
    el.scrollLeft = Math.max(0, offset - el.clientWidth / 2);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStart, pxPerDay]);

  // Expansion state
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(
    () => new Set(project.epics.map((e) => e._id))
  );
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const hasExpanded = expandedEpics.size > 0;

  const expandAll = useCallback(() => {
    setExpandedEpics(new Set(project.epics.map((e) => e._id)));
    setExpandedFeatures(new Set(
      project.epics.flatMap((e) => e.features.map((f) => f._id))
    ));
  }, [project]);

  const collapseAll = useCallback(() => {
    setExpandedEpics(new Set());
    setExpandedFeatures(new Set());
  }, []);

  const rows = useMemo(
    () => buildRows(project, expandedEpics, expandedFeatures),
    [project, expandedEpics, expandedFeatures]
  );

  const { groups, dayLabels } = useMemo(
    () => buildHeader(scale, localStart, localTotalDays, fmtDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, localStart, localTotalDays]
  );
  const HEADER_H = 48;

  // Panel resize
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    setIsResizing(true);
    function onMove(ev: MouseEvent) {
      setPanelWidth(Math.min(Math.max(startW + ev.clientX - startX, PANEL_MIN), PANEL_MAX));
    }
    function onUp() {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // Scroll sync
  const panelRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const onPanelScroll = useCallback(() => {
    if (syncingRef.current || !panelRef.current || !timelineRef.current) return;
    syncingRef.current = true;
    timelineRef.current.scrollTop = panelRef.current.scrollTop;
    syncingRef.current = false;
  }, []);

  const onTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Sync vertical scroll to task panel
    if (!syncingRef.current && panelRef.current) {
      syncingRef.current = true;
      panelRef.current.scrollTop = el.scrollTop;
      syncingRef.current = false;
    }
    // Infinite horizontal scroll — only react when a pending scroll target isn't
    // in flight (avoids triggering extensions during programmatic scrollLeft sets)
    if (pendingScrollTarget.current !== null) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollLeft + clientWidth > scrollWidth - THRESHOLD_PX) {
      setLocalTotalDays((d) => d + CHUNK);
    }
    if (scrollLeft < THRESHOLD_PX) {
      pendingScrollAdjust.current = CHUNK * pxPerDay;
      setLocalStart((d) => addDays(d, -CHUNK));
      setLocalTotalDays((d) => d + CHUNK);
    }
  }, [pxPerDay]);

  // Apply left-extension scroll compensation before paint
  useLayoutEffect(() => {
    if (pendingScrollAdjust.current !== 0 && timelineRef.current) {
      timelineRef.current.scrollLeft += pendingScrollAdjust.current;
      pendingScrollAdjust.current = 0;
    }
  });

  const timelineScrollCallback = useCallback((el: HTMLDivElement | null) => {
    (timelineRef as React.RefObject<HTMLDivElement | null>).current = el;
  }, []);

  const toggleEpic = (id: string) =>
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const toggleFeature = (id: string) =>
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  function barLeft(start: string) {
    const d = toDate(start);
    if (!d) return 0;
    return Math.max(differenceInCalendarDays(d, localStart) * pxPerDay, 0);
  }
  function barWidth(start: string, end: string) {
    const s = toDate(start);
    const e = toDate(end);
    if (!s || !e) return pxPerDay;
    return Math.max((differenceInCalendarDays(e, s) + 1) * pxPerDay, pxPerDay);
  }

  // Final statuses set
  const finalValues = useMemo(() => new Set(statuses.filter((s) => s.isFinal).map((s) => s.value)), [statuses]);

  // Footer stats
  const epics = project.epics || [];
  const totalTasks = epics.reduce((s, e) => s + (e.features || []).reduce((ss, f) => ss + (f.tasks || []).length, 0), 0);
  const overdueCount = epics.reduce(
    (s, e) => s + (e.features || []).reduce(
      (ss, f) => ss + (f.tasks || []).filter(
        (tt) => !finalValues.has(tt.status) && parseISO(tt.plannedEnd) < today
      ).length, 0
    ), 0
  );
  const doneCount = epics.reduce(
    (s, e) => s + (e.features || []).reduce(
      (ss, f) => ss + (f.tasks || []).filter((tt) => finalValues.has(tt.status)).length, 0
    ), 0
  );

  // Bar tooltip state
  const [tooltip, setTooltip] = useState<{ row: FlatRow; x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top Navbar ──────────────────────────────────────────── */}
      <header className="flex items-center h-12 px-4 gap-3 border-b border-border bg-surface-2 shrink-0">
        {/* Project name */}
        <h1 className="flex items-center gap-2 font-semibold text-sm text-foreground truncate shrink-0">
          {project.color && (
            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: project.color }} />
          )}
          {project.name}
        </h1>

        {/* Scale toggles */}
        <div className="flex items-center bg-accent/60 rounded-md p-0.5 gap-0">
          {SCALE_VALUES.map((value) => (
            <button
              key={value}
              onClick={() => setScale(value)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-colors',
                scale === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(`topnav.scales.${value}`)}
            </button>
          ))}
        </div>

        {/* Jump to today */}
        <button
          onClick={jumpToToday}
          title={t('topnav.jumpToToday')}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors"
        >
          <Crosshair size={12} />
          {t('topnav.today')}
        </button>

        <div className="flex-1" />

        {/* Language & theme controls */}
        <LanguageSwitcher variant="dropdown" />
        <ThemeToggle />

        {/* Snapshot badge */}
        {mode === 'snapshot' && versionName && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <Eye size={12} className="shrink-0" />
            {versionName}
          </span>
        )}

        {/* Expiry info */}
        {expiresAt && (
          <span className="text-[11px] text-muted-foreground">
            {tShared('expiresAt', {
              date: fmt.dateTime(new Date(expiresAt), { year: 'numeric', month: 'short', day: 'numeric' }),
            })}
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Task Panel ────────────────────────────────────────── */}
        <div className="relative flex flex-col shrink-0" style={{ width: panelWidth }}>
          {/* Header */}
          <div
            className="sticky top-0 z-20 flex items-center border-b border-border bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0"
            style={{ height: HEADER_H }}
          >
            <div className="flex-1 px-3 flex items-center gap-1.5">
              <button
                onClick={hasExpanded ? collapseAll : expandAll}
                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                title={hasExpanded ? t('taskPanel.collapseAll') : t('taskPanel.expandAll')}
              >
                {hasExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              </button>
              {t('taskPanel.name')}
            </div>
            <div className="w-7 text-center">{t('taskPanel.owner')}</div>
            <div className="w-[88px] text-center">{t('taskPanel.status')}</div>
            <div className="w-12 text-center">{t('taskPanel.days')}</div>
            <div className="w-14 text-center">{t('taskPanel.pct')}</div>
          </div>

          {/* Rows */}
          <div
            ref={panelRef}
            className="overflow-y-auto overflow-x-hidden gantt-scroll"
            onScroll={onPanelScroll}
          >
            {rows.map((row) => {
              const groupColor = EPIC_COLORS_PANEL[row.epicColorIdx % EPIC_COLORS_PANEL.length];
              const statusConfig = statuses.find((s) => s.value === row.status);
              const isFinal = statusConfig?.isFinal ?? false;
              const delayDays = getDelayDays(row.plannedEnd, row.actualEnd, isFinal);
              const isLate = delayDays > 0 && !isFinal;
              const ownerUser = users.find((u) => u.uid === row.ownerId);

              return (
                <div
                  key={row.rowKey}
                  className={cn(
                    'flex items-center border-b border-border/40 text-xs relative',
                    row.level === 'epic' && 'bg-[var(--row-alt)]',
                    row.isNotFirstEpic && 'border-t-2 border-t-border/60',
                  )}
                  style={{ height: ROW_H }}
                >
                  {/* Epic group left accent stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{
                      width: row.level === 'epic' ? 3 : 2,
                      backgroundColor:
                        row.pct >= 100 ? 'rgba(16,185,129,0.8)' :
                        isLate ? 'rgba(239,68,68,0.6)' :
                        groupColor,
                    }}
                  />

                  {/* Name cell */}
                  <div className="flex-1 flex items-center gap-1 px-3 pl-2.5 min-w-0">
                    {row.level === 'feature' && <ConnectorLine isLast={row.isLastSibling} />}
                    {row.level === 'task' && (
                      <>
                        <ContinuationLine active={!row.parentIsLast} />
                        <ConnectorLine isLast={row.isLastSibling} />
                      </>
                    )}

                    {row.level !== 'task' ? (
                      <button
                        onClick={() => {
                          if (row.level === 'epic') toggleEpic(row.epicId);
                          else if (row.featureId) toggleFeature(row.featureId);
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {row.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    ) : (
                      <span className="w-3.5 shrink-0 flex items-center justify-center">
                        <span className={cn('w-1.5 h-1.5 rounded-full', isLate ? 'bg-red-500' : 'bg-muted-foreground/40')} />
                      </span>
                    )}

                    <span className={cn(
                      'truncate ml-0.5',
                      isLate ? 'text-red-500 dark:text-red-400' : 'text-foreground',
                      row.level === 'epic' && 'text-foreground font-semibold text-[12px]',
                      row.level === 'feature' && 'text-foreground font-medium',
                    )}>
                      {row.name}
                    </span>
                  </div>

                  {/* Owner */}
                  <div className="w-7 flex items-center justify-center shrink-0">
                    <OwnerAvatar name={ownerUser?.name} color={ownerUser?.color} />
                  </div>

                  {/* Status */}
                  <div className="w-[88px] flex items-center justify-center shrink-0">
                    <ReadonlyStatusBadge status={row.status} statuses={statuses} />
                  </div>

                  {/* Days */}
                  <div className="w-12 flex items-center justify-center shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {row.dayCount != null ? `${row.dayCount}d` : '—'}
                    </span>
                  </div>

                  {/* Completion % */}
                  <div className="w-14 flex items-center justify-center shrink-0">
                    <span className="text-[11px] text-muted-foreground">{row.pct}%</span>
                  </div>

                  {/* Mini progress bar at row bottom */}
                  {row.pct > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-border/30">
                      <div
                        className={cn(
                          'h-full transition-all',
                          row.pct >= 100 ? 'bg-emerald-500/60' :
                          isLate ? 'bg-red-500/50' : 'bg-blue-500/50'
                        )}
                        style={{ width: `${Math.min(row.pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeMouseDown}
            className={cn('absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-30', isResizing && 'bg-blue-500/40')}
          >
            <div className={cn(
              'absolute inset-y-0 right-0 w-px transition-colors',
              isResizing ? 'bg-blue-500' : 'bg-border group-hover:bg-blue-500/60',
            )} />
          </div>
        </div>

        {/* ── Timeline ──────────────────────────────────────────── */}
        <div
          ref={timelineScrollCallback}
          className="flex-1 overflow-auto relative gantt-scroll"
          onScroll={onTimelineScroll}
        >
          <div style={{ width: totalWidth, minWidth: '100%', position: 'relative' }}>

            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-border bg-surface-2" style={{ height: HEADER_H }}>
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
              <div className="flex absolute left-0" style={{ top: 24, height: 24 }}>
                {dayLabels.map((d, i) => (
                  <div
                    key={i}
                    style={{ width: pxPerDay, minWidth: pxPerDay }}
                    className={cn(
                      'shrink-0 flex items-center justify-center text-[10px] font-medium border-r border-border/40',
                      d.isToday ? 'text-blue-500 bg-blue-500/10' :
                      d.isWeekend ? 'text-muted-foreground/50 bg-[var(--weekend-bg)]' :
                      'text-muted-foreground/70'
                    )}
                  >
                    {pxPerDay >= 16 ? d.label : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div style={{ position: 'relative' }}>
              {rows.map((row) => {
                const groupColor = EPIC_COLORS_TIMELINE[row.epicColorIdx % EPIC_COLORS_TIMELINE.length];
                const bLeft = barLeft(row.plannedStart);
                const bWidth = barWidth(row.plannedStart, row.plannedEnd);
                const barH = BAR_H[row.level];
                const barTop = (ROW_H - barH) / 2;

                const s = toDate(row.plannedStart);
                const e = toDate(row.plannedEnd);

                const statusConfig = statuses.find((st) => st.value === row.status);
                const isFinal = statusConfig?.isFinal ?? false;
                const barColorHex = statusConfig?.color ?? DEFAULT_BAR_COLOR;
                const delayDays = getDelayDays(row.plannedEnd, row.actualEnd, isFinal);
                const isDelayed = delayDays > 0 && !isFinal;
                const barColor = isDelayed ? '#ef4444' : barColorHex;
                const epicClipPath = row.level === 'epic'
                  ? 'polygon(6px 0%, calc(100% - 6px) 0%, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0% 50%)'
                  : undefined;

                return (
                  <div
                    key={row.rowKey}
                    className={cn(
                      'relative border-b border-border/40',
                      row.level === 'epic' && 'bg-[var(--row-alt)]',
                      row.isNotFirstEpic && 'border-t-2 border-t-border/60',
                    )}
                    style={{ height: ROW_H }}
                  >
                    {/* Column grid + weekend shading */}
                    {dayLabels.map((d, i) => (
                      <div
                        key={i}
                        className={cn('absolute top-0 bottom-0', d.isWeekend && 'bg-[var(--weekend-bg)]', 'border-r border-border/30')}
                        style={{ left: i * pxPerDay, width: pxPerDay }}
                      />
                    ))}

                    {/* Epic accent stripe */}
                    <div
                      className="absolute left-0 top-0 bottom-0 z-[5] pointer-events-none"
                      style={{ width: row.level === 'epic' ? 3 : 2, backgroundColor: groupColor }}
                    />

                    {/* Bar */}
                    {s && e && (
                      <div
                        className={cn(
                          'absolute rounded flex items-center select-none',
                          isDelayed && 'overdue-glow',
                          row.level === 'epic' && 'rounded-sm',
                        )}
                        style={{ left: bLeft, width: bWidth, height: barH, top: barTop, backgroundColor: barColor, clipPath: epicClipPath }}
                        onMouseMove={(ev) => setTooltip({ row, x: ev.clientX, y: ev.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {row.pct > 0 && (
                          <div
                            className={cn('absolute inset-y-0 left-0 rounded-l bg-white/20', row.pct >= 100 && 'rounded')}
                            style={{ width: `${Math.min(row.pct, 100)}%` }}
                          />
                        )}
                        {bWidth > 44 && row.level !== 'epic' && (
                          <span className="relative px-2 text-[10px] font-semibold text-white/90 truncate leading-none pointer-events-none whitespace-nowrap flex items-center gap-1">
                            {isDelayed && <span className="opacity-90">⚠</span>}
                            {row.name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Delay label */}
                    {isDelayed && (
                      <div
                        className="absolute top-1/2 text-[10px] font-semibold whitespace-nowrap pointer-events-none text-red-400"
                        style={{ left: bLeft - 2, transform: 'translateX(-100%) translateY(-50%)' }}
                      >
                        +{delayDays}d
                      </div>
                    )}
                  </div>
                );
              })}

              {rows.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground/50 text-xs">
                  No items to display
                </div>
              )}
            </div>

            {/* Today marker */}
            {todayOffset >= 0 && todayOffset <= totalWidth && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10 pointer-events-none today-pulse"
                  style={{ left: todayOffset }}
                />
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
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border text-[11px] text-muted-foreground bg-surface-2 shrink-0">
        <span className="tabular-nums">{t('footer.tasks', { count: totalTasks })}</span>
        {doneCount > 0 && (
          <span className="text-emerald-500">{t('footer.done', { count: doneCount })}</span>
        )}
        {overdueCount > 0 && (
          <span className="text-red-500 font-medium animate-pulse">{t('footer.overdue', { count: overdueCount })}</span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setZoomLevel(stepZoom(zoomLevel, 'out'))}
            disabled={zoomLevel <= ZOOM_STEPS[0]}
            title={t('zoom.zoomOut')}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            title={t('zoom.resetZoom')}
            className="px-2 py-0.5 rounded text-[11px] tabular-nums text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[42px] text-center"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={() => setZoomLevel(stepZoom(zoomLevel, 'in'))}
            disabled={zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            title={t('zoom.zoomIn')}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Bar tooltip portal */}
      {tooltip && typeof document !== 'undefined' && createPortal(
        <BarTooltip
          row={tooltip.row}
          x={tooltip.x}
          y={tooltip.y}
          statuses={statuses}
          users={users}
          fmtShort={fmtShort}
          finalValues={finalValues}
          tBar={t}
        />,
        document.body
      )}
    </div>
  );
}

// ─── Bar Tooltip ─────────────────────────────────────────────────────────────

interface BarTooltipProps {
  row: FlatRow;
  x: number;
  y: number;
  statuses: IStatusConfig[];
  users: IUserConfig[];
  fmtShort: (iso: string | undefined) => string;
  finalValues: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tBar: any;
}

function BarTooltip({ row, x, y, users, fmtShort, finalValues, tBar }: BarTooltipProps) {
  const isFinal = finalValues.has(row.status);
  const delayDays = getDelayDays(row.plannedEnd, row.actualEnd, isFinal);
  const isDelayed = delayDays > 0 && !isFinal;
  const isEarly = delayDays < 0 && isFinal;
  const earlyDays = Math.abs(delayDays);
  const durationDays = (() => {
    const s = toDate(row.plannedStart);
    const e = toDate(row.plannedEnd);
    if (!s || !e) return 0;
    return differenceInCalendarDays(e, s) + 1;
  })();
  const ownerUser = users.find((u) => u.uid === row.ownerId);

  const diffLabel = isDelayed
    ? tBar('bar.overdue', { days: delayDays })
    : isEarly
    ? tBar('bar.early', { days: earlyDays })
    : tBar('bar.onSchedule');

  return (
    <div
      style={{ position: 'fixed', left: x + 14, top: y - 80, zIndex: 9999, pointerEvents: 'none' }}
      className="bg-popover border border-border text-popover-foreground text-xs p-3 max-w-[220px] space-y-1.5 rounded shadow-lg"
    >
      <p className="font-semibold text-foreground">{row.name}</p>
      {ownerUser && <p className="text-muted-foreground text-[11px]">{tBar('bar.owner')}: {ownerUser.name}</p>}
      <div className="border-t border-border pt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">{tBar('bar.plannedStart')}</span>
        <span>{fmtShort(row.plannedStart)}</span>
        <span className="text-muted-foreground">{tBar('bar.plannedEnd')}</span>
        <span>{fmtShort(row.plannedEnd)}</span>
        {row.actualStart && (
          <>
            <span className="text-muted-foreground">{tBar('bar.actualStart')}</span>
            <span>{fmtShort(row.actualStart)}</span>
          </>
        )}
        {row.actualEnd && (
          <>
            <span className="text-muted-foreground">{tBar('bar.actualEnd')}</span>
            <span>{fmtShort(row.actualEnd)}</span>
          </>
        )}
        <span className="text-muted-foreground">{tBar('bar.duration')}</span>
        <span>{durationDays}d</span>
        <span className="text-muted-foreground">{tBar('bar.progress')}</span>
        <span>{row.pct}%</span>
      </div>
      <p className={cn(
        'text-[11px] font-medium pt-0.5',
        isDelayed ? 'text-red-400' : isEarly ? 'text-emerald-400' : 'text-muted-foreground'
      )}>
        {diffLabel}
      </p>
    </div>
  );
}

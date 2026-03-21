import { IEpic, IFeature, IStatusConfig } from '@/types';
import {
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  differenceInCalendarDays,
  parseISO,
  isValid,
  min as dateMin,
  max as dateMax,
} from 'date-fns';
import { TimelineScale } from '@/types';

// ─── Date rollup helpers ─────────────────────────────────────────────────────

function toDate(val: string | Date | undefined): Date | null {
  if (!val) return null;
  const d = typeof val === 'string' ? parseISO(val) : val;
  return isValid(d) ? d : null;
}

function toISO(d: Date | null): string | undefined {
  return d ? d.toISOString() : undefined;
}

// Default final statuses used when no config is provided (server-side fallback)
const DEFAULT_FINAL = new Set(['done', 'canceled']);

/** Derive a parent status from its children's statuses.
 *  When statusConfigs is provided, uses isFinal from settings.
 *  Otherwise falls back to hardcoded defaults.
 */
export function deriveStatus(childStatuses: string[], statusConfigs?: IStatusConfig[]): string {
  if (childStatuses.length === 0) return 'todo';

  const finalValues = statusConfigs
    ? new Set(statusConfigs.filter((s) => s.isFinal).map((s) => s.value))
    : DEFAULT_FINAL;
  const firstStatus = statusConfigs?.[0]?.value ?? 'todo';

  const allFinal = childStatuses.every((s) => finalValues.has(s));
  if (allFinal) {
    // Prefer 'done' if present among children, otherwise first child's status
    const doneValue = childStatuses.find((s) => s === 'done');
    return doneValue ?? childStatuses[0];
  }

  const allFirst = childStatuses.every((s) => s === firstStatus);
  if (allFirst) return firstStatus;

  // Any non-first, non-final status means work is active
  const hasActive = childStatuses.some((s) => s !== firstStatus && !finalValues.has(s));
  const hasFinal = childStatuses.some((s) => finalValues.has(s));
  if (hasActive || hasFinal) return 'in-progress';

  return firstStatus;
}

/** Recalculate a Feature's aggregate dates, completion, and status from its tasks. */
export function rollupFeatureDates(feature: IFeature, statusConfigs?: IStatusConfig[]): IFeature {
  if (!feature.tasks || feature.tasks.length === 0) return feature;

  const plannedStarts = feature.tasks.map((t) => toDate(t.plannedStart)).filter(Boolean) as Date[];
  const plannedEnds = feature.tasks.map((t) => toDate(t.plannedEnd)).filter(Boolean) as Date[];
  const actualStarts = feature.tasks.map((t) => toDate(t.actualStart)).filter(Boolean) as Date[];
  const actualEnds = feature.tasks.map((t) => toDate(t.actualEnd)).filter(Boolean) as Date[];

  const totalPct = feature.tasks.reduce((sum, t) => sum + (t.completionPct ?? 0), 0);
  const avgPct = Math.round(totalPct / feature.tasks.length);

  return {
    ...feature,
    status: deriveStatus(feature.tasks.map((t) => t.status), statusConfigs),
    plannedStart: plannedStarts.length ? dateMin(plannedStarts).toISOString() : feature.plannedStart,
    plannedEnd: plannedEnds.length ? dateMax(plannedEnds).toISOString() : feature.plannedEnd,
    actualStart: toISO(actualStarts.length ? dateMin(actualStarts) : null),
    actualEnd: toISO(actualEnds.length ? dateMax(actualEnds) : null),
    completionPct: avgPct,
  };
}

/** Recalculate an Epic's aggregate dates, completion, and status from its features. */
export function rollupEpicDates(epic: IEpic, statusConfigs?: IStatusConfig[]): IEpic {
  if (!epic.features || epic.features.length === 0) return epic;

  // First rollup each feature
  const rolledFeatures = epic.features.map((f) => rollupFeatureDates(f, statusConfigs));

  const plannedStarts = rolledFeatures.map((f) => toDate(f.plannedStart)).filter(Boolean) as Date[];
  const plannedEnds = rolledFeatures.map((f) => toDate(f.plannedEnd)).filter(Boolean) as Date[];
  const actualStarts = rolledFeatures.map((f) => toDate(f.actualStart)).filter(Boolean) as Date[];
  const actualEnds = rolledFeatures.map((f) => toDate(f.actualEnd)).filter(Boolean) as Date[];

  const totalPct = rolledFeatures.reduce((sum, f) => sum + (f.completionPct ?? 0), 0);
  const avgPct = Math.round(totalPct / rolledFeatures.length);

  return {
    ...epic,
    features: rolledFeatures,
    status: deriveStatus(rolledFeatures.map((f) => f.status), statusConfigs),
    plannedStart: plannedStarts.length ? dateMin(plannedStarts).toISOString() : epic.plannedStart,
    plannedEnd: plannedEnds.length ? dateMax(plannedEnds).toISOString() : epic.plannedEnd,
    actualStart: toISO(actualStarts.length ? dateMin(actualStarts) : null),
    actualEnd: toISO(actualEnds.length ? dateMax(actualEnds) : null),
    completionPct: avgPct,
  };
}

// ─── Timeline calculation helpers ────────────────────────────────────────────

export interface TimelineColumn {
  label: string;
  subLabel?: string;
  start: Date;
  end: Date;
  isWeekend?: boolean;
  isToday?: boolean;
}

export function getTimelineColumns(
  scale: TimelineScale,
  startDate: Date,
  count: number
): TimelineColumn[] {
  const today = new Date();
  const cols: TimelineColumn[] = [];

  for (let i = 0; i < count; i++) {
    let start: Date = new Date();
    let end: Date = new Date();
    let label: string = '';
    let subLabel: string | undefined;

    switch (scale) {
      case 'week': {
        start = addWeeks(startOfWeek(startDate, { weekStartsOn: 1 }), i);
        end = addDays(start, 7);
        const weekEnd = addDays(start, 6);
        label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const isToday = today >= start && today < end;
        cols.push({ label, start, end, isToday });
        continue;
      }
      case 'month': {
        start = addMonths(startOfMonth(startDate), i);
        end = addMonths(start, 1);
        label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const isToday = today >= start && today < end;
        cols.push({ label, start, end, isToday });
        continue;
      }
      case 'quarter': {
        start = addQuarters(startOfQuarter(startDate), i);
        end = addQuarters(start, 1);
        const qNum = Math.floor(start.getMonth() / 3) + 1;
        label = `Q${qNum} ${start.getFullYear()}`;
        const isToday = today >= start && today < end;
        cols.push({ label, start, end, isToday });
        continue;
      }
    }

    cols.push({ label, subLabel, start, end });
  }

  return cols;
}

/** How many pixels wide a bar should be based on date range and column width. */
export function getBarStyle(
  itemStart: string,
  itemEnd: string,
  columns: TimelineColumn[],
  columnWidth: number
): { left: number; width: number } | null {
  if (!columns.length) return null;

  const start = toDate(itemStart);
  const end = toDate(itemEnd);
  if (!start || !end) return null;

  const timelineStart = columns[0].start;
  const timelineEnd = columns[columns.length - 1].end;
  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  const totalPx = columns.length * columnWidth;

  const leftMs = Math.max(start.getTime() - timelineStart.getTime(), 0);
  const widthMs = Math.min(end.getTime(), timelineEnd.getTime()) - Math.max(start.getTime(), timelineStart.getTime());

  if (widthMs <= 0) return null;

  const left = (leftMs / totalMs) * totalPx;
  const width = Math.max((widthMs / totalMs) * totalPx, 4);

  return { left, width };
}

/** Returns the diff in calendar days between planned end and actual/current date (positive = late). */
export function getDelayDays(plannedEnd: string, actualEnd?: string, isFinal?: boolean): number {
  const planned = toDate(plannedEnd);
  if (!planned) return 0;
  // Only use actualEnd for finished items; in-progress items compare against today
  const actual = (isFinal && actualEnd) ? toDate(actualEnd) : new Date();
  if (!actual) return 0;
  return differenceInCalendarDays(actual, planned);
}

/** Count calendar or business days from start to end (inclusive). */
export function countDays(start: Date, end: Date, allowWeekends: boolean): number {
  if (allowWeekends) return differenceInCalendarDays(end, start) + 1;
  let count = 0;
  let cur = start;
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur = addDays(cur, 1);
  }
  return Math.max(count, 1);
}

/** Add N calendar or business days to start (1 = same day). */
export function addWorkdays(start: Date, n: number, allowWeekends: boolean): Date {
  const days = Math.max(n - 1, 0);
  if (allowWeekends) return addDays(start, days);
  let remaining = days;
  let cur = start;
  while (remaining > 0) {
    cur = addDays(cur, 1);
    const d = cur.getDay();
    if (d !== 0 && d !== 6) remaining--;
  }
  return cur;
}

/**
 * If weekends are disabled, snap a date to the nearest workday.
 * Start dates snap forward (Mon), end dates snap backward (Fri).
 */
export function snapToWorkday(date: Date, direction: 'forward' | 'backward' = 'forward'): Date {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  if (day === 6) return direction === 'forward' ? addDays(date, 2) : addDays(date, -1);
  if (day === 0) return direction === 'forward' ? addDays(date, 1) : addDays(date, -2);
  return date;
}

/**
 * Derives the timeline canvas start date so that:
 * - All project items are reachable (canvas begins before the earliest item)
 * - Today is also always reachable (today is included in the min calculation)
 * Returns { startDate, todayOffsetDays } so callers can scroll the viewport
 * to show today on first render.
 */
export function getProjectTimelineStart(
  project: { epics: IEpic[] },
  scale: TimelineScale,
): { startDate: Date; todayOffsetDays: number } {
  const today = new Date();
  // Always include today so the canvas covers it even if all items are in the past/future
  const dates: Date[] = [today];
  for (const epic of project.epics) {
    if (epic.plannedStart) { const d = parseISO(epic.plannedStart); if (isValid(d)) dates.push(d); }
    for (const feat of epic.features) {
      if (feat.plannedStart) { const d = parseISO(feat.plannedStart); if (isValid(d)) dates.push(d); }
      for (const task of feat.tasks) {
        if (task.plannedStart) { const d = parseISO(task.plannedStart); if (isValid(d)) dates.push(d); }
      }
    }
  }
  const earliest = dateMin(dates);
  // Back up enough to give breathing room before the first bar
  const pad = scale === 'week' ? 14 : scale === 'month' ? 30 : 90;
  const startDate = startOfWeek(addDays(earliest, -pad), { weekStartsOn: 1 });
  const todayOffsetDays = differenceInCalendarDays(today, startDate);
  return { startDate, todayOffsetDays };
}

/** Default timeline start date for a given scale. */
export function getDefaultStartDate(scale: TimelineScale): Date {
  const today = new Date();
  switch (scale) {
    case 'week':
      return startOfWeek(addWeeks(today, -1), { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(addMonths(today, -1));
    case 'quarter':
      return startOfQuarter(addQuarters(today, -1));
  }
}

/** Number of columns to render for a given scale (covers ~3 months). */
export function getColumnCount(scale: TimelineScale): number {
  switch (scale) {
    case 'week':
      return 16;
    case 'month':
      return 6;
    case 'quarter':
      return 4;
  }
}

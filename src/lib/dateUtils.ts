import { IEpic, IFeature, ITask } from '@/types';
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

/** Recalculate a Feature's aggregate dates and completion from its tasks. */
export function rollupFeatureDates(feature: IFeature): IFeature {
  if (!feature.tasks || feature.tasks.length === 0) return feature;

  const plannedStarts = feature.tasks.map((t) => toDate(t.plannedStart)).filter(Boolean) as Date[];
  const plannedEnds = feature.tasks.map((t) => toDate(t.plannedEnd)).filter(Boolean) as Date[];
  const actualStarts = feature.tasks.map((t) => toDate(t.actualStart)).filter(Boolean) as Date[];
  const actualEnds = feature.tasks.map((t) => toDate(t.actualEnd)).filter(Boolean) as Date[];

  const totalPct = feature.tasks.reduce((sum, t) => sum + (t.completionPct ?? 0), 0);
  const avgPct = Math.round(totalPct / feature.tasks.length);

  return {
    ...feature,
    plannedStart: plannedStarts.length ? dateMin(plannedStarts).toISOString() : feature.plannedStart,
    plannedEnd: plannedEnds.length ? dateMax(plannedEnds).toISOString() : feature.plannedEnd,
    actualStart: toISO(actualStarts.length ? dateMin(actualStarts) : null),
    actualEnd: toISO(actualEnds.length ? dateMax(actualEnds) : null),
    completionPct: avgPct,
  };
}

/** Recalculate an Epic's aggregate dates and completion from its features. */
export function rollupEpicDates(epic: IEpic): IEpic {
  if (!epic.features || epic.features.length === 0) return epic;

  // First rollup each feature
  const rolledFeatures = epic.features.map(rollupFeatureDates);

  const plannedStarts = rolledFeatures.map((f) => toDate(f.plannedStart)).filter(Boolean) as Date[];
  const plannedEnds = rolledFeatures.map((f) => toDate(f.plannedEnd)).filter(Boolean) as Date[];
  const actualStarts = rolledFeatures.map((f) => toDate(f.actualStart)).filter(Boolean) as Date[];
  const actualEnds = rolledFeatures.map((f) => toDate(f.actualEnd)).filter(Boolean) as Date[];

  const totalPct = rolledFeatures.reduce((sum, f) => sum + (f.completionPct ?? 0), 0);
  const avgPct = Math.round(totalPct / rolledFeatures.length);

  return {
    ...epic,
    features: rolledFeatures,
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

/** Returns the diff in calendar days between planned end and actual end (positive = late). */
export function getDelayDays(plannedEnd: string, actualEnd?: string): number {
  const planned = toDate(plannedEnd);
  if (!planned) return 0;
  const actual = actualEnd ? toDate(actualEnd) : new Date();
  if (!actual) return 0;
  return differenceInCalendarDays(actual, planned);
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

'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { GanttTaskPanel, VisibleRow } from './GanttTaskPanel';
import { GanttTimeline, GanttTimelineHandle } from './GanttTimeline';
import { GanttBar, GanttBarData } from './GanttBar';
import { AddItemDialog } from '@/components/dialogs/AddItemDialog';
import { addDays, parseISO, isValid, differenceInCalendarDays } from 'date-fns';
import { snapToWorkday } from '@/lib/dateUtils';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { IStatusConfig } from '@/types';
import { BarChart3, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

const BASE_PX_PER_DAY: Record<string, number> = { week: 28, month: 10, quarter: 4 };
const OVERLAY_BAR_H = 22;

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function stepZoom(current: number, dir: 'in' | 'out'): number {
  if (dir === 'in') return ZOOM_STEPS.find((z) => z > current + 0.01) ?? current;
  return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.01) ?? current;
}

function taskHasIssue(task: { status: string; plannedEnd: string }, statusConfigs: IStatusConfig[]): boolean {
  const config = statusConfigs.find((s) => s.value === task.status);
  const isFinal = config?.isFinal ?? false;
  return !isFinal && parseISO(task.plannedEnd) < new Date();
}

function safeParseISO(s: string | undefined): Date | null {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
}

export function GanttBoard() {
  const t = useTranslations('gantt');
  const project = useProjectStore(selectDisplayProject);
  const {
    timelineScale,
    updateTask, updateFeature, updateEpic, updateDayCount,
    expandedEpicIds, expandedFeatureIds,
    isVersionReadOnly, isLoadingProject,
    zoomLevel, setZoomLevel,
  } = useProjectStore();

  const pxPerDay = BASE_PX_PER_DAY[timelineScale] * zoomLevel;

  const allowWeekends = useSettingsStore((s) => s.allowWeekends);
  const statuses = useSettingsStore((s) => s.statuses);

  // Zoom — keyboard shortcuts (Cmd/Ctrl +/-/0) and Ctrl+wheel
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return;
      const { zoomLevel: z, setZoomLevel: sz } = useProjectStore.getState();
      if (e.key === '=' || e.key === '+') { e.preventDefault(); sz(stepZoom(z, 'in')); }
      else if (e.key === '-')             { e.preventDefault(); sz(stepZoom(z, 'out')); }
      else if (e.key === '0')             { e.preventDefault(); sz(1); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { zoomLevel: z, setZoomLevel: sz } = useProjectStore.getState();
      sz(stepZoom(z, e.deltaY > 0 ? 'out' : 'in'));
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Scroll sync
  const taskPanelRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<GanttTimelineHandle>(null);
  const syncingRef = useRef(false);

  const onTaskPanelScroll = useCallback((top: number) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    timelineRef.current?.scrollTo(top);
    syncingRef.current = false;
  }, []);

  const onTimelineScroll = useCallback((top: number) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (taskPanelRef.current) taskPanelRef.current.scrollTop = top;
    syncingRef.current = false;
  }, []);

  // Add-item dialog
  const [addDialog, setAddDialog] = useState<{
    mode: 'epic' | 'feature' | 'task';
    epicId?: string; featureId?: string;
  } | null>(null);

  // Active drag tracking
  const [activeDrag, setActiveDrag] = useState<{
    bar: GanttBarData; overlayWidth: number;
  } | null>(null);

  // Live preview delta
  const [dragDelta, setDragDelta] = useState<{
    id: string;
    x: number;
  } | null>(null);

  // ── Build flat visible rows (data rows + inline add-rows) ───────────────
  const visibleRows = useMemo(() => {
    const rows: VisibleRow[] = [];
    if (!project || !Array.isArray(project.epics)) return rows;

    const ADD_STUB = { name: '', status: 'todo' as const, completionPct: 0, plannedStart: '', plannedEnd: '' };

    for (const epic of project.epics) {
      const epicHasIssue = epic.features.some((f) => f.tasks.some((t) => taskHasIssue(t, statuses)));
      rows.push({
        rowKey: `epic-${epic._id}`,
        epicId: epic._id,
        level: 'epic',
        name: epic.name,
        status: epic.status,
        ownerId: epic.ownerId,
        completionPct: epic.completionPct,
        plannedStart: epic.plannedStart,
        plannedEnd: epic.plannedEnd,
        actualStart: epic.actualStart,
        actualEnd: epic.actualEnd,
        dayCount: epic.dayCount,
        isExpanded: expandedEpicIds.has(epic._id),
        hasWarning: epicHasIssue,
        bar: {
          id: `bar-epic-${epic._id}`,
          epicId: epic._id,
          level: 'epic',
          status: epic.status,
          plannedStart: epic.plannedStart,
          plannedEnd: epic.plannedEnd,
          actualEnd: epic.actualEnd,
          label: epic.name,
          pct: epic.completionPct,
          hasWarning: epicHasIssue,
        },
      });

      if (!expandedEpicIds.has(epic._id)) continue;

      for (const feat of epic.features) {
        const featHasIssue = feat.tasks.some((t) => taskHasIssue(t, statuses));
        rows.push({
          rowKey: `feat-${feat._id}`,
          epicId: epic._id,
          featureId: feat._id,
          level: 'feature',
          name: feat.name,
          status: feat.status,
          ownerId: feat.ownerId,
          completionPct: feat.completionPct,
          plannedStart: feat.plannedStart,
          plannedEnd: feat.plannedEnd,
          actualStart: feat.actualStart,
          actualEnd: feat.actualEnd,
          dayCount: feat.dayCount,
          isExpanded: expandedFeatureIds.has(feat._id),
          hasWarning: featHasIssue,
          bar: {
            id: `bar-feat-${feat._id}`,
            epicId: epic._id,
            featureId: feat._id,
            level: 'feature',
            status: feat.status,
            plannedStart: feat.plannedStart,
            plannedEnd: feat.plannedEnd,
            actualEnd: feat.actualEnd,
            label: feat.name,
            pct: feat.completionPct,
            ownerId: feat.ownerId,
            hasWarning: featHasIssue,
          },
        });

        if (!expandedFeatureIds.has(feat._id)) continue;

        for (const task of feat.tasks) {
          rows.push({
            rowKey: `task-${task._id}`,
            epicId: epic._id,
            featureId: feat._id,
            taskId: task._id,
            level: 'task',
            name: task.name,
            status: task.status,
            ownerId: task.ownerId,
            completionPct: task.completionPct,
            plannedStart: task.plannedStart,
            plannedEnd: task.plannedEnd,
            actualStart: task.actualStart,
            actualEnd: task.actualEnd,
            dayCount: task.dayCount,
            bar: {
              id: `bar-task-${task._id}`,
              epicId: epic._id,
              featureId: feat._id,
              taskId: task._id,
              level: 'task',
              status: task.status,
              plannedStart: task.plannedStart,
              plannedEnd: task.plannedEnd,
              actualEnd: task.actualEnd,
              label: task.name,
              pct: task.completionPct,
              ownerId: task.ownerId,
            },
          });
        }

        if (!isVersionReadOnly) {
          rows.push({
            ...ADD_STUB,
            rowKey: `add-task-${feat._id}`,
            epicId: epic._id,
            featureId: feat._id,
            level: 'task',
            isAddRow: true,
            addRowCallback: () => setAddDialog({ mode: 'task', epicId: epic._id, featureId: feat._id }),
          });
        }
      }

      if (!isVersionReadOnly) {
        rows.push({
          ...ADD_STUB,
          rowKey: `add-feat-${epic._id}`,
          epicId: epic._id,
          level: 'feature',
          isAddRow: true,
          addRowCallback: () => setAddDialog({ mode: 'feature', epicId: epic._id }),
        });
      }
    }

    if (!isVersionReadOnly) {
      rows.push({
        ...ADD_STUB,
        rowKey: 'add-epic',
        epicId: '__new__',
        level: 'epic',
        isAddRow: true,
        addRowCallback: () => setAddDialog({ mode: 'epic' }),
      });
    }

    return rows;
  }, [project, expandedEpicIds, expandedFeatureIds, isVersionReadOnly, statuses]);

  // ── DnD ────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const dragId = event.active.id as string;
    setDragDelta({ id: dragId, x: 0 });

    if (dragId.startsWith('resize-')) return;

    const row = visibleRows.find((r) => r.bar?.id === dragId);
    if (!row?.bar) return;
    const s = safeParseISO(row.bar.plannedStart);
    const e = safeParseISO(row.bar.plannedEnd);
    const width = s && e ? Math.max((differenceInCalendarDays(e, s) + 1) * pxPerDay, 8) : pxPerDay * 7;
    setActiveDrag({ bar: row.bar, overlayWidth: width });
  }, [visibleRows, pxPerDay]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    setDragDelta({ id: event.active.id as string, x: event.delta.x });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    setDragDelta(null);
    const { active, delta } = event;
    if (!delta.x) return;

    const deltaDays = Math.round(delta.x / pxPerDay);
    if (deltaDays === 0) return;

    const dragId = active.id as string;

    // ── Resize ────────────────────────────────────────────────────────────
    if (dragId.startsWith('resize-')) {
      const isRight = dragId.startsWith('resize-right:');
      const barId = dragId.slice(dragId.indexOf(':') + 1);
      const row = visibleRows.find((r) => r.bar?.id === barId);
      if (!row?.bar) return;

      const oldStart = safeParseISO(row.bar.plannedStart);
      const oldEnd   = safeParseISO(row.bar.plannedEnd);
      if (!oldStart || !oldEnd) return;

      if (isRight) {
        const raw = addDays(oldEnd, deltaDays);
        const newEnd = allowWeekends ? raw : snapToWorkday(raw, 'backward');
        if (newEnd.getTime() <= oldStart.getTime()) return;
        const patch = { plannedEnd: newEnd.toISOString() };
        if (row.level === 'task' && row.featureId && row.taskId)
          updateTask(row.epicId, row.featureId, row.taskId, patch);
        else if (row.level === 'feature' && row.featureId)
          updateFeature(row.epicId, row.featureId, patch);
        else if (row.level === 'epic')
          updateEpic(row.epicId, patch);
      } else {
        const raw = addDays(oldStart, deltaDays);
        const newStart = allowWeekends ? raw : snapToWorkday(raw, 'forward');
        if (newStart.getTime() >= oldEnd.getTime()) return;
        const patch = { plannedStart: newStart.toISOString() };
        if (row.level === 'task' && row.featureId && row.taskId)
          updateTask(row.epicId, row.featureId, row.taskId, patch);
        else if (row.level === 'feature' && row.featureId)
          updateFeature(row.epicId, row.featureId, patch);
        else if (row.level === 'epic')
          updateEpic(row.epicId, patch);
      }
      return;
    }

    // ── Move (shift whole bar) ────────────────────────────────────────────
    const row = visibleRows.find((r) => r.bar?.id === dragId);
    if (!row?.bar) return;

    const oldStart = safeParseISO(row.bar.plannedStart);
    const oldEnd   = safeParseISO(row.bar.plannedEnd);
    if (!oldStart || !oldEnd) return;

    function snap(d: Date, dir: 'forward' | 'backward') {
      return allowWeekends ? d : snapToWorkday(d, dir);
    }

    const newStart = snap(addDays(oldStart, deltaDays), 'forward').toISOString();
    const newEnd   = snap(addDays(oldEnd,   deltaDays), 'backward').toISOString();

    if (row.level === 'task' && row.featureId && row.taskId) {
      updateTask(row.epicId, row.featureId, row.taskId, { plannedStart: newStart, plannedEnd: newEnd });
    } else if (row.level === 'feature' && row.featureId) {
      const epicData = project?.epics.find((e) => e._id === row.epicId);
      const featData = epicData?.features.find((f) => f._id === row.featureId);
      if (featData) {
        for (const task of featData.tasks) {
          const ts = safeParseISO(task.plannedStart);
          const te = safeParseISO(task.plannedEnd);
          if (ts && te) {
            updateTask(row.epicId, row.featureId!, task._id, {
              plannedStart: snap(addDays(ts, deltaDays), 'forward').toISOString(),
              plannedEnd:   snap(addDays(te, deltaDays), 'backward').toISOString(),
            });
          }
        }
      }
    } else if (row.level === 'epic') {
      const epicData = project?.epics.find((e) => e._id === row.epicId);
      if (epicData) {
        for (const feat of epicData.features) {
          for (const task of feat.tasks) {
            const ts = safeParseISO(task.plannedStart);
            const te = safeParseISO(task.plannedEnd);
            if (ts && te) {
              updateTask(row.epicId, feat._id, task._id, {
                plannedStart: snap(addDays(ts, deltaDays), 'forward').toISOString(),
                plannedEnd:   snap(addDays(te, deltaDays), 'backward').toISOString(),
              });
            }
          }
        }
      }
    }
  }, [visibleRows, pxPerDay, allowWeekends, updateTask, updateFeature, updateEpic, project]);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (isLoadingProject) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="skeleton h-7 rounded w-64 shrink-0" style={{ opacity: 1 - i * 0.12 }} />
            <div className="skeleton h-5 rounded flex-1" style={{ opacity: 1 - i * 0.12 }} />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground">
        <BarChart3 size={48} strokeWidth={1} />
        <p className="text-sm">{t('taskPanel.selectProject')}</p>
      </div>
    );
  }

  const epics = project.epics || []; // Ensure epics is an array
  const totalTasks = epics.reduce((s, e) => s + (e.features || []).reduce((ss, f) => ss + (f.tasks || []).length, 0), 0);
  const finalValues = new Set(statuses.filter(s => s.isFinal).map(s => s.value));
  const overdueCount = epics.reduce(
    (s, e) => s + (e.features || []).reduce(
      (ss, f) => ss + (f.tasks || []).filter(
        (t) => !finalValues.has(t.status) && parseISO(t.plannedEnd) < new Date()
      ).length, 0
    ), 0
  );
  const doneCount = epics.reduce(
    (s, e) => s + (e.features || []).reduce((ss, f) => ss + (f.tasks || []).filter((t) => finalValues.has(t.status)).length, 0), 0
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveDrag(null); setDragDelta(null); }}
    >
      <div ref={boardRef} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <GanttTaskPanel
            ref={taskPanelRef}
            visibleRows={visibleRows}
            onScrollY={onTaskPanelScroll}
            onAddFeature={(epicId) => setAddDialog({ mode: 'feature', epicId })}
            onAddTask={(epicId, featureId) => setAddDialog({ mode: 'task', epicId, featureId })}
            onDayCountChange={(epicId, featureId, taskId, n) => updateDayCount(epicId, featureId, taskId, n)}
          />

          <GanttTimeline
            ref={timelineRef}
            visibleRows={visibleRows}
            onScrollY={onTimelineScroll}
            dragDelta={dragDelta}
          />
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

          {/* Zoom controls */}
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
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div
            className="pointer-events-none"
            style={{ width: activeDrag.overlayWidth, height: OVERLAY_BAR_H }}
          >
            <GanttBar
              {...activeDrag.bar}
              left={0}
              width={activeDrag.overlayWidth}
              readonly
              isOverlay
              pxPerDay={pxPerDay}
              allowWeekends={allowWeekends}
            />
          </div>
        )}
      </DragOverlay>

      {addDialog && (
        <AddItemDialog
          open
          onClose={() => setAddDialog(null)}
          mode={addDialog.mode}
          epicId={addDialog.epicId}
          featureId={addDialog.featureId}
        />
      )}
    </DndContext>
  );
}

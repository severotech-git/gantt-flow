'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { useTranslations } from 'next-intl';
import { ITask } from '@/types';
import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getDelayDays } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import { KanbanEmptyState } from './KanbanEmptyState';
import { KanbanToolbar, KanbanFilters } from './KanbanToolbar';
import { KanbanFeatureRow } from './KanbanFeatureRow';
import { KanbanStandaloneSection, StandaloneFeatureEntry } from './KanbanStandaloneSection';

function postItemChangelog(
  projectId: string,
  epicId: string,
  featureId: string | undefined,
  taskId: string | undefined,
  field: string,
  oldValue: string | undefined,
  newValue: string | undefined,
) {
  if (!oldValue || !newValue || oldValue === newValue) return;
  fetch(`/api/projects/${projectId}/changelog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ epicId, featureId, taskId, field, oldValue, newValue }),
  }).catch(() => {});
}

const DEFAULT_FILTERS: KanbanFilters = {
  epicId: null,
  assigneeId: null,
  onlyOverdue: false,
  hideDone: false,
  search: '',
};

export function KanbanBoard() {
  const t = useTranslations('kanban');

  const project = useProjectStore(selectDisplayProject);
  const updateTask = useProjectStore((s) => s.updateTask);
  const updateFeature = useProjectStore((s) => s.updateFeature);
  const statuses = useSettingsStore((s) => s.statuses);
  const levelNames = useSettingsStore((s) => s.levelNames);

  const boardRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_FILTERS);
  const [collapsedFeatures, setCollapsedFeatures] = useState<Record<string, boolean>>({});
  const [standaloneCollapsed, setStandaloneCollapsed] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const finalStatusValues = useMemo(
    () => new Set(statuses.filter((s) => s.isFinal).map((s) => s.value)),
    [statuses]
  );

  // Build task filter predicate from current filters
  const taskMatchesFilters = useCallback(
    (task: ITask): boolean => {
      if (filters.assigneeId && task.ownerId !== filters.assigneeId) return false;
      if (filters.hideDone && finalStatusValues.has(task.status)) return false;
      if (filters.onlyOverdue) {
        const isFinal = finalStatusValues.has(task.status);
        if (isFinal || getDelayDays(task.plannedEnd, task.actualEnd, isFinal) <= 0) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!task.name.toLowerCase().includes(q)) return false;
      }
      return true;
    },
    [filters, finalStatusValues]
  );

  // Build feature groups from visible epics
  const { featureGroups, standaloneEntries } = useMemo(() => {
    if (!project) return { featureGroups: [], standaloneEntries: [] as StandaloneFeatureEntry[] };

    const epicSource = filters.epicId
      ? project.epics.filter((e) => e._id === filters.epicId)
      : project.epics;

    const groups: Array<{
      feature: (typeof epicSource)[0]['features'][0];
      epicId: string;
      epicName: string;
      epicColor?: string;
      filteredTasks: ITask[];
    }> = [];
    const standalone: StandaloneFeatureEntry[] = [];

    for (const epic of epicSource) {
      for (const feature of epic.features) {
        if (feature.tasks.length > 0) {
          const filteredTasks = feature.tasks.filter(taskMatchesFilters);
          // Hide feature row entirely if no tasks pass filter (when any active filter)
          const hasActiveFilter =
            filters.assigneeId || filters.onlyOverdue || filters.hideDone || filters.search;
          if (hasActiveFilter && filteredTasks.length === 0) continue;
          groups.push({
            feature,
            epicId: epic._id,
            epicName: epic.name,
            epicColor: epic.color,
            filteredTasks,
          });
        } else {
          // Standalone feature: apply filters at feature level
          if (filters.assigneeId && feature.ownerId !== filters.assigneeId) continue;
          if (filters.hideDone && finalStatusValues.has(feature.status)) continue;
          if (filters.onlyOverdue) {
            const isFinal = finalStatusValues.has(feature.status);
            if (isFinal || getDelayDays(feature.plannedEnd, feature.actualEnd, isFinal) <= 0) continue;
          }
          if (filters.search && !feature.name.toLowerCase().includes(filters.search.toLowerCase())) continue;
          standalone.push({ feature, epicId: epic._id, epicName: epic.name, epicColor: epic.color });
        }
      }
    }

    return { featureGroups: groups, standaloneEntries: standalone };
  }, [project, filters, taskMatchesFilters, finalStatusValues]);

  function toggleFeature(featureId: string) {
    setCollapsedFeatures((prev) => ({ ...prev, [featureId]: !prev[featureId] }));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !project) return;

    const dropData = over.data.current as {
      statusValue: string;
      featureId?: string;
      epicId?: string;
      zoneType: 'task' | 'standalone';
    };
    const dragData = active.data.current as {
      type: 'task' | 'feature';
      epicId: string;
      featureId: string;
      taskId?: string;
      currentStatus: string;
    };

    if (!dropData || !dragData || dragData.currentStatus === dropData.statusValue) return;

    const newStatus = dropData.statusValue;

    if (dropData.zoneType === 'task') {
      // Task drops: only within same feature
      if (dragData.type !== 'task' || !dragData.taskId) return;
      if (dragData.featureId !== dropData.featureId) return;
      updateTask(dragData.epicId, dragData.featureId, dragData.taskId, { status: newStatus });
      postItemChangelog(project._id, dragData.epicId, dragData.featureId, dragData.taskId, 'status', dragData.currentStatus, newStatus);
    } else if (dropData.zoneType === 'standalone') {
      // Standalone feature drops
      if (dragData.type !== 'feature') return;
      updateFeature(dragData.epicId, dragData.featureId, { status: newStatus });
      postItemChangelog(project._id, dragData.epicId, dragData.featureId, undefined, 'status', dragData.currentStatus, newStatus);
    }
  }

  // Find active drag data for DragOverlay
  const findActiveDragData = useCallback(() => {
    if (!activeDragId || !project) return null;
    if (activeDragId.startsWith('kanban-task-')) {
      for (const epic of project.epics) {
        for (const feature of epic.features) {
          for (const task of feature.tasks) {
            if (`kanban-task-${epic._id}-${feature._id}-${task._id}` === activeDragId) {
              return { item: task, epicId: epic._id, epicName: epic.name, epicColor: epic.color, featureId: feature._id, featureName: feature.name, taskId: task._id, isFeatureCard: false as const };
            }
          }
        }
      }
    }
    if (activeDragId.startsWith('kanban-feature-')) {
      for (const epic of project.epics) {
        for (const feature of epic.features) {
          if (`kanban-feature-${epic._id}-${feature._id}` === activeDragId) {
            return { item: feature, epicId: epic._id, epicName: epic.name, epicColor: epic.color, featureId: feature._id, featureName: feature.name, isFeatureCard: true as const };
          }
        }
      }
    }
    return null;
  }, [activeDragId, project]);

  const activeDragData = findActiveDragData();

  // Sync horizontal scroll across all card-grid zones (and the hidden global header)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    boardRef.current?.querySelectorAll<HTMLElement>('[data-kanban-scroll]').forEach((el) => {
      if (el !== e.currentTarget) el.scrollLeft = left;
    });
  }, []);

  if (!project) return null;

  const hasAnyItems = project.epics.some((e) => e.features.length > 0);
  if (!hasAnyItems) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <KanbanEmptyState
          message={t('emptyBoard')}
          subtitle={t('emptyBoardSubtitle', { epicLabel: levelNames.epic, featureLabel: levelNames.feature })}
          variant="board"
        />
      </div>
    );
  }

  const hasFilteredResults = featureGroups.length > 0 || standaloneEntries.length > 0;
  const isDragging = activeDragId !== null;
  const gridTemplate = `repeat(${statuses.length}, 280px)`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={boardRef} className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <KanbanToolbar
          epics={project.epics}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Global column header — clipped horizontally, scrollLeft synced via JS */}
        <div
          data-kanban-scroll
          className="shrink-0 overflow-x-hidden border-b border-border/50 bg-background z-20"
        >
          <div
            className="min-w-max"
            style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
          >
            {statuses.map((status) => (
              <div
                key={status.value}
                className="flex items-center gap-2 px-3 py-2 border-r border-border/20 last:border-r-0 border-t-[3px]"
                style={{ borderTopColor: status.color }}
              >
                <span className="text-xs font-semibold text-foreground truncate">
                  {status.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body — vertical scroll only; feature headers stay full-width */}
        <div className="flex-1 overflow-y-auto">
          {/* No results */}
          {!hasFilteredResults && (
            <div className="flex items-center justify-center py-16">
              <KanbanEmptyState message={t('noResults')} variant="column" />
            </div>
          )}

          {/* Feature swim lane rows */}
          {featureGroups.map(({ feature, epicId, epicName, epicColor, filteredTasks }) => (
            <KanbanFeatureRow
              key={feature._id}
              feature={feature}
              epicId={epicId}
              epicName={epicName}
              epicColor={epicColor}
              statuses={statuses}
              collapsed={!!collapsedFeatures[feature._id]}
              onToggle={() => toggleFeature(feature._id)}
              filteredTasks={filteredTasks}
              isDragging={isDragging}
              onScroll={handleScroll}
            />
          ))}

          {/* Standalone features section */}
          {standaloneEntries.length > 0 && (
            <KanbanStandaloneSection
              entries={standaloneEntries}
              statuses={statuses}
              collapsed={standaloneCollapsed}
              onToggle={() => setStandaloneCollapsed((v) => !v)}
              isDragging={isDragging}
              onScroll={handleScroll}
            />
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragData && (
          <div className={cn('w-[280px] shadow-xl ring-2 ring-primary/30 scale-[1.02] rounded-lg pointer-events-none')}>
            <KanbanCard
              item={activeDragData.item}
              epicId={activeDragData.epicId}
              featureId={activeDragData.featureId}
              taskId={'taskId' in activeDragData ? activeDragData.taskId : undefined}
              isFeatureCard={activeDragData.isFeatureCard}
              epicName={activeDragData.epicName}
              epicColor={activeDragData.epicColor}
              featureName={activeDragData.featureName}
              disabled
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

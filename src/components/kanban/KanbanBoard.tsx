'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { KanbanColumn, KanbanColumnItem } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanEmptyState } from './KanbanEmptyState';
import { KanbanToolbar, GroupBy } from './KanbanToolbar';

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

export function KanbanBoard() {
  const t = useTranslations('kanban');

  const project = useProjectStore(selectDisplayProject);
  const updateTask = useProjectStore((s) => s.updateTask);
  const updateFeature = useProjectStore((s) => s.updateFeature);
  const statuses = useSettingsStore((s) => s.statuses);
  const levelNames = useSettingsStore((s) => s.levelNames);

  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Filter epics by selected tab
  const visibleEpics = useMemo(() => {
    if (!project) return [];
    if (selectedEpicId === null) return project.epics;
    return project.epics.filter((e) => e._id === selectedEpicId);
  }, [project, selectedEpicId]);

  // Build flat annotated item list from all visible epics
  const flatItems = useMemo(() => {
    const items: Array<{
      item: Parameters<typeof KanbanCard>[0]['item'];
      epicId: string;
      epicName: string;
      epicColor?: string;
      featureId: string;
      featureName: string;
      featureColor?: string;
      taskId?: string;
      isFeatureCard: boolean;
      status: string;
    }> = [];

    for (const epic of visibleEpics) {
      for (const feature of epic.features) {
        if (feature.tasks.length > 0) {
          // Task cards
          for (const task of feature.tasks) {
            items.push({
              item: task,
              epicId: epic._id,
              epicName: epic.name,
              epicColor: epic.color,
              featureId: feature._id,
              featureName: feature.name,
              featureColor: feature.color,
              taskId: task._id,
              isFeatureCard: false,
              status: task.status,
            });
          }
        } else {
          // Standalone feature card
          items.push({
            item: feature,
            epicId: epic._id,
            epicName: epic.name,
            epicColor: epic.color,
            featureId: feature._id,
            featureName: feature.name,
            featureColor: feature.color,
            isFeatureCard: true,
            status: feature.status,
          });
        }
      }
    }
    return items;
  }, [visibleEpics]);

  // Build per-column items with optional grouping
  const columnItems = useMemo(() => {
    const map = new Map<string, KanbanColumnItem[]>();
    for (const s of statuses) {
      map.set(s.value, []);
    }

    // Group items by status, then optionally insert group headers
    const byStatus = new Map<string, typeof flatItems>();
    for (const s of statuses) byStatus.set(s.value, []);
    for (const item of flatItems) {
      byStatus.get(item.status)?.push(item);
    }

    for (const s of statuses) {
      const statusItems = byStatus.get(s.value) ?? [];
      const col: KanbanColumnItem[] = [];

      if (groupBy === 'none') {
        for (const item of statusItems) {
          col.push({ type: 'card', ...item });
        }
      } else {
        // Group by epic or feature
        const grouped = new Map<string, { header: KanbanColumnItem; cards: KanbanColumnItem[] }>();
        for (const item of statusItems) {
          const groupId = groupBy === 'epic' ? item.epicId : item.featureId;
          const groupName = groupBy === 'epic' ? item.epicName : item.featureName;
          const groupColor = groupBy === 'epic' ? item.epicColor : item.featureColor;

          if (!grouped.has(groupId)) {
            grouped.set(groupId, {
              header: { type: 'group-header', id: groupId, name: groupName, color: groupColor },
              cards: [],
            });
          }
          grouped.get(groupId)!.cards.push({ type: 'card', ...item });
        }

        for (const { header, cards } of grouped.values()) {
          col.push(header);
          col.push(...cards);
        }
      }

      map.set(s.value, col);
    }

    return map;
  }, [flatItems, statuses, groupBy]);

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || !project) return;

    const overId = String(over.id);
    if (!overId.startsWith('kanban-col-')) return;

    const dropData = over.data.current as { statusValue: string };
    const newStatus = dropData.statusValue;

    const dragData = active.data.current as {
      type: 'task' | 'feature';
      epicId: string;
      featureId: string;
      taskId?: string;
      currentStatus: string;
    };

    if (!dragData || dragData.currentStatus === newStatus) return;

    if (dragData.type === 'task' && dragData.taskId) {
      updateTask(dragData.epicId, dragData.featureId, dragData.taskId, { status: newStatus });
      postItemChangelog(project._id, dragData.epicId, dragData.featureId, dragData.taskId, 'status', dragData.currentStatus, newStatus);
    } else if (dragData.type === 'feature') {
      updateFeature(dragData.epicId, dragData.featureId, { status: newStatus });
      postItemChangelog(project._id, dragData.epicId, dragData.featureId, undefined, 'status', dragData.currentStatus, newStatus);
    }
  }

  // Find active drag item for DragOverlay (no useMemo — React Compiler handles this)
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

  if (!project) return null;

  const hasAnyItems = project.epics.some((e) => e.features.length > 0);
  if (!hasAnyItems) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <KanbanEmptyState
          message={t('emptyBoard')}
          subtitle={t('emptyBoardSubtitle', {
            epicLabel: levelNames.epic,
            featureLabel: levelNames.feature,
          })}
          variant="board"
        />
      </div>
    );
  }

  const isDragging = activeDragId !== null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar: epic filter + groupBy */}
        <KanbanToolbar
          epics={project.epics}
          selectedEpicId={selectedEpicId}
          onSelectEpic={setSelectedEpicId}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
        />

        {/* Columns */}
        <div className={cn('flex-1 overflow-x-auto overflow-y-hidden')}>
          <div className="flex flex-row h-full">
            {statuses.map((status) => (
              <KanbanColumn
                key={status.value}
                status={status}
                items={columnItems.get(status.value) ?? []}
                collapsedGroups={collapsedGroups}
                onToggleGroup={toggleGroup}
                isDragging={isDragging}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragData && (
          <div className="w-[256px] shadow-xl ring-2 ring-primary/30 scale-[1.02] rounded-lg pointer-events-none">
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

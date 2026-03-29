'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IStatusConfig, ITask, IFeature } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanCard } from './KanbanCard';
import { KanbanEmptyState } from './KanbanEmptyState';
import { cn } from '@/lib/utils';

export interface KanbanCardItem {
  type: 'card';
  item: ITask | IFeature;
  epicId: string;
  featureId: string;
  taskId?: string;
  isFeatureCard: boolean;
  epicName: string;
  epicColor?: string;
  featureName: string;
}

export interface KanbanGroupHeader {
  type: 'group-header';
  id: string;
  name: string;
  color?: string;
}

export type KanbanColumnItem = KanbanCardItem | KanbanGroupHeader;

interface KanbanColumnProps {
  status: IStatusConfig;
  items: KanbanColumnItem[];
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string) => void;
  isDragging: boolean;
}

export function KanbanColumn({
  status,
  items,
  collapsedGroups,
  onToggleGroup,
  isDragging,
}: KanbanColumnProps) {
  const t = useTranslations('kanban');

  const { setNodeRef, isOver } = useDroppable({
    id: `kanban-col-${status.value}`,
    data: { statusValue: status.value },
  });

  // Count actual cards (not group headers), accounting for collapsed groups
  const cardCount = items.filter((i) => i.type === 'card').length;

  // Determine which group headers precede each card (to know if collapsed)
  let currentGroupId: string | null = null;
  const visibleItems: KanbanColumnItem[] = [];
  for (const item of items) {
    if (item.type === 'group-header') {
      currentGroupId = item.id;
      visibleItems.push(item);
    } else {
      if (currentGroupId === null || !collapsedGroups[currentGroupId]) {
        visibleItems.push(item);
      }
    }
  }

  return (
    <div className="w-[280px] min-w-[280px] flex flex-col border-r border-border/30 last:border-r-0">
      <KanbanColumnHeader status={status} count={cardCount} />

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 transition-colors',
          isOver && isDragging && 'bg-primary/[0.03]'
        )}
      >
        <ScrollArea className="h-full">
          <div className="p-2 flex flex-col gap-2 min-h-[200px]">
            {visibleItems.length === 0 && (
              <KanbanEmptyState
                message={t('emptyColumn')}
                variant="column"
              />
            )}

            {visibleItems.map((item, idx) => {
              if (item.type === 'group-header') {
                const isCollapsed = !!collapsedGroups[item.id];
                return (
                  <button
                    key={`gh-${item.id}-${idx}`}
                    onClick={() => onToggleGroup(item.id)}
                    className="flex items-center gap-1.5 px-1 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full text-left"
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed
                      ? <ChevronRight size={11} className="shrink-0" />
                      : <ChevronDown size={11} className="shrink-0" />
                    }
                    {item.color && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="truncate">{item.name}</span>
                  </button>
                );
              }

              return (
                <KanbanCard
                  key={item.taskId
                    ? `${item.epicId}-${item.featureId}-${item.taskId}`
                    : `${item.epicId}-${item.featureId}`
                  }
                  item={item.item}
                  epicId={item.epicId}
                  featureId={item.featureId}
                  taskId={item.taskId}
                  isFeatureCard={item.isFeatureCard}
                  epicName={item.epicName}
                  epicColor={item.epicColor}
                  featureName={item.featureName}
                />
              );
            })}

            {/* Drop placeholder */}
            {isOver && isDragging && (
              <div className="border-2 border-dashed border-primary/30 rounded-lg h-16 bg-primary/5 flex items-center justify-center">
                <span className="text-xs text-primary/50">
                  {t('dropHere', { status: status.label })}
                </span>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

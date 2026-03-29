import { useState, useCallback } from 'react';
import { KanbanFilters, DEFAULT_KANBAN_FILTERS } from '@/components/kanban/KanbanToolbar';

type ViewType = 'gantt' | 'kanban';

function storageKey(projectId: string, view: ViewType): string {
  return `gf:filters:${projectId}:${view}`;
}

function readFromStorage(key: string): KanbanFilters {
  if (typeof window === 'undefined') return DEFAULT_KANBAN_FILTERS;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return DEFAULT_KANBAN_FILTERS;
    return { ...DEFAULT_KANBAN_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_KANBAN_FILTERS;
  }
}

export function usePersistedFilters(projectId: string | undefined, view: ViewType) {
  const key = projectId ? storageKey(projectId, view) : null;

  const [trackedKey, setTrackedKey] = useState(key);
  const [filters, setFiltersState] = useState<KanbanFilters>(() =>
    key ? readFromStorage(key) : DEFAULT_KANBAN_FILTERS
  );

  // Derived-state pattern: reset when projectId/view changes (runs during render, not in an effect)
  if (trackedKey !== key) {
    setTrackedKey(key);
    setFiltersState(key ? readFromStorage(key) : DEFAULT_KANBAN_FILTERS);
  }

  const setFilters = useCallback(
    (next: KanbanFilters) => {
      setFiltersState(next);
      if (!key) return;
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        // sessionStorage unavailable (private browsing quota, etc.)
      }
    },
    [key]
  );

  return [filters, setFilters] as const;
}

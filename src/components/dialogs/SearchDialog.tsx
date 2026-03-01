'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useProjectStore } from '@/store/useProjectStore';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { parseISO, format, isValid, addDays } from 'date-fns';
import { Search, Layers, Box, CheckSquare } from 'lucide-react';
import { StatusType } from '@/types';

interface SearchItem {
  barId: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  level: 'epic' | 'feature' | 'task';
  name: string;
  status: StatusType;
  plannedStart: string;
  plannedEnd: string;
  parentName?: string;
  grandparentName?: string;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const LEVEL_ICONS = { epic: Layers, feature: Box, task: CheckSquare };
const LEVEL_LABELS = { epic: 'Epics', feature: 'Features', task: 'Tasks' };

function fmtDate(iso: string) {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'MMM d') : '—';
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    activeProject,
    expandedEpicIds,
    expandedFeatureIds,
    toggleEpic,
    toggleFeature,
    setTimelineStartDate,
    setFocusedBarId,
  } = useProjectStore();

  // Focus input and reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Flatten all items into a searchable list
  const allItems = useMemo<SearchItem[]>(() => {
    if (!activeProject) return [];
    const items: SearchItem[] = [];
    const epics = activeProject.epics || []; // Ensure epics is an array
    for (const epic of epics) {
      items.push({
        barId: `bar-epic-${epic._id}`,
        epicId: epic._id,
        level: 'epic',
        name: epic.name,
        status: epic.status,
        plannedStart: epic.plannedStart,
        plannedEnd: epic.plannedEnd,
      });
      const features = epic.features || []; // Ensure features is an array
      for (const feat of features) {
        items.push({
          barId: `bar-feat-${feat._id}`,
          epicId: epic._id,
          featureId: feat._id,
          level: 'feature',
          name: feat.name,
          status: feat.status,
          plannedStart: feat.plannedStart,
          plannedEnd: feat.plannedEnd,
          parentName: epic.name,
        });
        const tasks = feat.tasks || []; // Ensure tasks is an array
        for (const task of tasks) {
          items.push({
            barId: `bar-task-${task._id}`,
            epicId: epic._id,
            featureId: feat._id,
            taskId: task._id,
            level: 'task',
            name: task.name,
            status: task.status,
            plannedStart: task.plannedStart,
            plannedEnd: task.plannedEnd,
            parentName: feat.name,
            grandparentName: epic.name,
          });
        }
      }
    }
    return items;
  }, [activeProject]);

  // Filter by query
  const filtered = useMemo<SearchItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.parentName?.toLowerCase().includes(q) ||
        item.grandparentName?.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Group by level — only non-empty groups
  const groups = useMemo(() => {
    return (['epic', 'feature', 'task'] as const)
      .map((level) => ({ level, items: filtered.filter((i) => i.level === level) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  // Reset active index when results change
  useEffect(() => { setActiveIdx(0); }, [filtered]);

  function handleSelect(item: SearchItem) {
    // Expand parents if currently collapsed
    if (!expandedEpicIds.has(item.epicId)) toggleEpic(item.epicId);
    if (item.featureId && !expandedFeatureIds.has(item.featureId)) toggleFeature(item.featureId);

    // Move the timeline origin to 3 days before the item starts
    const start = parseISO(item.plannedStart);
    if (isValid(start)) setTimelineStartDate(addDays(start, -3));

    // Trigger scroll-to in GanttTimeline
    setFocusedBarId(item.barId);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) handleSelect(filtered[activeIdx]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Flat list index for each group item (for keyboard nav highlight)
  let flatIdx = 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 max-w-lg overflow-hidden"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search items..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[420px]">
          {!activeProject && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">No project selected</p>
          )}

          {activeProject && filtered.length === 0 && query && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {activeProject && !query && (
            <p className="px-4 py-4 text-center text-[11px] text-muted-foreground/70">
              {allItems.length} items — type to search
            </p>
          )}

          {groups.map((group) => (
            <div key={group.level}>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/50 sticky top-0">
                {LEVEL_LABELS[group.level]}
              </div>
              {group.items.map((item) => {
                const Icon = LEVEL_ICONS[item.level];
                const idx = flatIdx++;
                return (
                  <button
                    key={item.barId}
                    data-idx={idx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/30 last:border-0',
                      activeIdx === idx ? 'bg-muted' : 'hover:bg-muted/60'
                    )}
                  >
                    <Icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground truncate">{item.name}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground truncate">
                        {item.grandparentName && (
                          <span>{item.grandparentName} › {item.parentName}</span>
                        )}
                        {!item.grandparentName && item.parentName && (
                          <span>{item.parentName}</span>
                        )}
                        {(item.grandparentName || item.parentName) && <span>·</span>}
                        <span className="shrink-0">{fmtDate(item.plannedStart)} – {fmtDate(item.plannedEnd)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[11px] text-muted-foreground">
          <span><kbd className="font-sans">↑↓</kbd> navigate</span>
          <span><kbd className="font-sans">↵</kbd> jump to item</span>
          <span><kbd className="font-sans">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

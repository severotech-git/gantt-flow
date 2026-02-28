'use client';

import { forwardRef, useState, useRef, useCallback } from 'react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Trash2, Check } from 'lucide-react';
import { getDelayDays } from '@/lib/dateUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GanttBarData } from './GanttBar';

export interface VisibleRow {
  rowKey: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  level: 'epic' | 'feature' | 'task';
  name: string;
  status: string;
  ownerId?: string;
  completionPct: number;
  plannedEnd: string;
  plannedStart: string;
  actualStart?: string;
  actualEnd?: string;
  isExpanded?: boolean;
  bar?: GanttBarData;
  hasWarning?: boolean;
  // Add-row marker
  isAddRow?: true;
  addRowCallback?: () => void;
}

export const ROW_H = 36;

const PANEL_MIN = 200;
const PANEL_MAX = 700;
const PANEL_DEFAULT = 460;

interface GanttTaskPanelProps {
  visibleRows: VisibleRow[];
  onScrollY: (scrollTop: number) => void;
  onAddFeature: (epicId: string) => void;
  onAddTask: (epicId: string, featureId: string) => void;
}

export const GanttTaskPanel = forwardRef<HTMLDivElement, GanttTaskPanelProps>(
  function GanttTaskPanel({ visibleRows, onScrollY, onAddFeature, onAddTask }, ref) {
    const {
      toggleEpic, toggleFeature,
      expandedEpicIds, expandedFeatureIds,
      removeEpic, removeFeature, removeTask,
      updateTask, updateFeature, updateEpic,
      isVersionReadOnly,
    } = useProjectStore();

    const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
    const [isResizing, setIsResizing] = useState(false);

    const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidth;
      setIsResizing(true);

      function onMouseMove(ev: MouseEvent) {
        const next = Math.min(Math.max(startWidth + ev.clientX - startX, PANEL_MIN), PANEL_MAX);
        setPanelWidth(next);
      }
      function onMouseUp() {
        setIsResizing(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }, [panelWidth]);

    return (
      <div className="relative flex flex-col shrink-0" style={{ width: panelWidth }}>
        {/* Header */}
        <div
          className="sticky top-0 z-20 flex items-center border-b border-border bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0"
          style={{ height: 48 }}
        >
          <div className="flex-1 px-3">Name</div>
          <div className="w-7 text-center">Owner</div>
          <div className="w-[88px] text-center">Status</div>
          <div className="w-14 text-center">%</div>
          <div className="w-16" />
        </div>

        {/* Rows */}
        <div
          ref={ref}
          className="overflow-y-auto overflow-x-hidden gantt-scroll"
          onScroll={(e) => onScrollY((e.target as HTMLDivElement).scrollTop)}
        >
          {visibleRows.map((row) =>
            row.isAddRow ? (
              <AddRow key={row.rowKey} row={row} />
            ) : (
              <TaskRow
                key={row.rowKey}
                row={row}
                isExpanded={
                  row.level === 'epic'
                    ? expandedEpicIds.has(row.epicId)
                    : expandedFeatureIds.has(row.featureId ?? '')
                }
                readonly={isVersionReadOnly}
                onToggle={() =>
                  row.level === 'epic'
                    ? toggleEpic(row.epicId)
                    : toggleFeature(row.featureId ?? '')
                }
                onDelete={() => {
                  if (row.level === 'epic') removeEpic(row.epicId);
                  else if (row.level === 'feature' && row.featureId) removeFeature(row.epicId, row.featureId);
                  else if (row.level === 'task' && row.featureId && row.taskId)
                    removeTask(row.epicId, row.featureId, row.taskId);
                }}
                onAddChild={() => {
                  if (row.level === 'epic') onAddFeature(row.epicId);
                  else if (row.level === 'feature' && row.featureId) onAddTask(row.epicId, row.featureId);
                }}
                onStatusChange={(status) => {
                  if (row.level === 'epic') updateEpic(row.epicId, { status });
                  else if (row.level === 'feature' && row.featureId) updateFeature(row.epicId, row.featureId, { status });
                  else if (row.level === 'task' && row.featureId && row.taskId)
                    updateTask(row.epicId, row.featureId, row.taskId, { status });
                }}
                onOwnerChange={(ownerId) => {
                  if (row.level === 'epic') updateEpic(row.epicId, { ownerId });
                  else if (row.level === 'feature' && row.featureId) updateFeature(row.epicId, row.featureId, { ownerId });
                  else if (row.level === 'task' && row.featureId && row.taskId)
                    updateTask(row.epicId, row.featureId, row.taskId, { ownerId });
                }}
                onPctChange={(pct) => {
                  if (row.level === 'task' && row.featureId && row.taskId)
                    updateTask(row.epicId, row.featureId, row.taskId, { completionPct: pct });
                  else if (row.level === 'feature' && row.featureId)
                    updateFeature(row.epicId, row.featureId, { completionPct: pct });
                }}
                onNameChange={(name) => {
                  if (row.level === 'epic') updateEpic(row.epicId, { name });
                  else if (row.level === 'feature' && row.featureId) updateFeature(row.epicId, row.featureId, { name });
                  else if (row.level === 'task' && row.featureId && row.taskId)
                    updateTask(row.epicId, row.featureId, row.taskId, { name });
                }}
              />
            )
          )}

          {visibleRows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground/50 text-xs">
              <p>No items yet.</p>
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          className={cn(
            'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-30',
            isResizing && 'bg-violet-500/40',
          )}
        >
          <div className={cn(
            'absolute inset-y-0 right-0 w-px transition-colors',
            isResizing ? 'bg-violet-500' : 'bg-border group-hover:bg-violet-500/60',
          )} />
        </div>
      </div>
    );
  }
);

// ─── AddRow ──────────────────────────────────────────────────────────────────

const ADD_ROW_STYLE = {
  epic:    { indent: 'pl-3',    accent: 'border-violet-500/40 text-violet-400/70 hover:text-violet-500 hover:bg-violet-500/5' },
  feature: { indent: 'pl-8',    accent: 'border-blue-500/30 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/5' },
  task:    { indent: 'pl-[52px]', accent: 'border-slate-500/30 text-muted-foreground hover:text-foreground hover:bg-muted/30' },
};

function AddRow({ row }: { row: VisibleRow }) {
  const levelNames = useSettingsStore((s) => s.levelNames);
  const style = ADD_ROW_STYLE[row.level];
  const levelLabel = row.level === 'epic' ? levelNames.epic : row.level === 'feature' ? levelNames.feature : levelNames.task;

  return (
    <button
      onClick={row.addRowCallback}
      className={cn(
        'w-full flex items-center gap-2 border-b border-border/30 transition-colors group',
        style.indent,
        style.accent,
      )}
      style={{ height: ROW_H }}
    >
      <span className="flex items-center justify-center w-4 h-4 rounded border border-dashed border-current opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        <Plus size={9} />
      </span>
      <span className="text-[11px] font-medium opacity-60 group-hover:opacity-100 transition-opacity">
        New {levelLabel}
      </span>
    </button>
  );
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  row: VisibleRow;
  isExpanded: boolean;
  readonly: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onStatusChange: (s: string) => void;
  onOwnerChange: (uid: string | undefined) => void;
  onPctChange: (n: number) => void;
  onNameChange: (s: string) => void;
}

function TaskRow({
  row,
  isExpanded,
  readonly,
  onToggle,
  onDelete,
  onAddChild,
  onStatusChange,
  onOwnerChange,
  onPctChange,
  onNameChange,
}: TaskRowProps) {
  const { statuses, users } = useSettingsStore();
  const statusConfig = statuses.find((s) => s.value === row.status);
  const ownerUser = users.find((u) => u.uid === row.ownerId);
  const isFinal = statusConfig?.isFinal ?? false;

  const delayDays = getDelayDays(row.plannedEnd, row.actualEnd);
  const isLate = delayDays > 0 && !isFinal;

  return (
    <div
      className={cn(
        'flex items-center border-b border-border/40 group text-xs relative',
        row.level === 'epic' && 'bg-[var(--row-alt)]',
      )}
      style={{ height: ROW_H }}
    >
      {/* Progress accent bar (left edge) */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-0.5 transition-opacity',
          row.completionPct >= 100 ? 'bg-emerald-500' :
          isLate ? 'bg-red-500/60' :
          row.level === 'epic' ? 'bg-violet-500/40' : 'bg-transparent'
        )}
      />

      {/* Name cell */}
      <div className="flex-1 flex items-center gap-1 px-3 pl-2.5 min-w-0">
        {row.level === 'feature' && <span className="w-3 shrink-0" />}
        {row.level === 'task' && <span className="w-6 shrink-0" />}

        {/* Expand/collapse or bullet */}
        {row.level !== 'task' ? (
          <button
            onClick={onToggle}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0 flex items-center justify-center">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isLate ? 'bg-red-500' : 'bg-muted-foreground/40'
            )} />
          </span>
        )}

        {/* Name */}
        <NameEditor
          value={row.name}
          onChange={onNameChange}
          readonly={readonly}
          className={cn(
            'truncate ml-0.5',
            isLate ? 'text-red-500 dark:text-red-400' : 'text-foreground',
            row.level === 'epic' && 'text-foreground font-semibold text-[12px]',
            row.level === 'feature' && 'text-foreground font-medium',
          )}
        />
      </div>

      {/* Owner (click to change) */}
      <div className="w-7 flex items-center justify-center shrink-0">
        {readonly || users.length === 0 ? (
          <OwnerAvatar name={ownerUser?.name} color={ownerUser?.color} />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="rounded-full hover:ring-2 hover:ring-ring/30 transition-all"
                title={ownerUser?.name ?? 'Assign owner'}
              >
                <OwnerAvatar name={ownerUser?.name} color={ownerUser?.color} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="text-xs min-w-[160px]"
              align="center"
            >
              <DropdownMenuItem
                onClick={() => onOwnerChange(undefined)}
                className={cn(
                  'cursor-pointer text-xs hover:bg-muted gap-2',
                  !row.ownerId && 'text-violet-500'
                )}
              >
                {!row.ownerId && <Check size={10} />}
                {row.ownerId && <span className="w-2.5" />}
                <span className="text-muted-foreground italic">Unassigned</span>
              </DropdownMenuItem>
              {users.map((u) => {
                const active = row.ownerId === u.uid;
                return (
                  <DropdownMenuItem
                    key={u.uid}
                    onClick={() => onOwnerChange(u.uid)}
                    className={cn(
                      'cursor-pointer text-xs hover:bg-muted gap-2',
                      active && 'text-violet-500'
                    )}
                  >
                    {active && <Check size={10} />}
                    {!active && <span className="w-2.5" />}
                    <OwnerAvatar name={u.name} color={u.color} size={16} />
                    <span className="flex-1">{u.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Status (click to edit) */}
      <div className="w-[88px] flex items-center justify-center shrink-0">
        {readonly ? (
          <StatusBadge status={row.status} />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded hover:ring-1 hover:ring-ring/30 transition-all">
                <StatusBadge status={row.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="text-xs min-w-[140px]"
              align="center"
            >
              {statuses.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => onStatusChange(s.value)}
                  className={cn(
                    'cursor-pointer text-xs gap-2',
                    s.value === row.status && 'text-violet-500'
                  )}
                >
                  {s.value === row.status && <Check size={10} />}
                  {s.value !== row.status && <span className="w-2.5" />}
                  <span className="flex-1">{s.label}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Completion % (click to edit on tasks/features) */}
      <div className="w-14 flex items-center justify-center shrink-0">
        {!readonly && row.level !== 'epic' ? (
          <PctEditor value={row.completionPct} onChange={onPctChange} />
        ) : (
          <span className="text-[11px] text-muted-foreground">{row.completionPct}%</span>
        )}
      </div>

      {/* Row actions (hover) */}
      {!readonly && (
        <div className="w-16 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {row.level !== 'task' && (
            <button
              onClick={onAddChild}
              className="p-1.5 rounded text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
              title={row.level === 'epic' ? 'Add feature' : 'Add task'}
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Mini progress bar at row bottom */}
      {row.completionPct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-border/30">
          <div
            className={cn(
              'h-full transition-all',
              row.completionPct >= 100 ? 'bg-emerald-500/60' :
              isLate ? 'bg-red-500/50' : 'bg-violet-500/50'
            )}
            style={{ width: `${Math.min(row.completionPct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Inline Name editor ──────────────────────────────────────────────────────

function NameEditor({ value, onChange, readonly, className }: { value: string; onChange: (s: string) => void; readonly: boolean; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const s = draft.trim();
    if (s && s !== value) onChange(s);
    else setDraft(value);
    setEditing(false);
  }

  if (readonly || !editing) {
    return (
      <button
        onClick={() => { if (!readonly) { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); } }}
        className={cn("text-left overflow-hidden min-w-0 flex-1", !readonly && "hover:bg-muted rounded px-1 -ml-1 transition-colors")}
        title={readonly ? undefined : "Click to edit name"}
      >
        <span className={className}>{value}</span>
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      className="flex-1 bg-muted border border-violet-500/50 rounded px-1 -ml-1 outline-none text-[inherit] font-[inherit]"
      autoFocus
    />
  );
}

// ─── Inline % editor ─────────────────────────────────────────────────────────

function PctEditor({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0 && n <= 100 && n !== value) onChange(n);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }}
        className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted px-1.5 py-0.5 rounded transition-colors tabular-nums"
        title="Click to edit"
      >
        {value}%
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      max={100}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className="w-12 text-[11px] text-foreground bg-muted border border-violet-500/50 rounded px-1 py-0.5 text-center outline-none tabular-nums"
      autoFocus
    />
  );
}

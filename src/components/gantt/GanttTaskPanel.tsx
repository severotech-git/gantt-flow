'use client';

import { forwardRef, useState, useRef, useCallback } from 'react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { useProjectStore } from '@/store/useProjectStore';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Plus, Trash2, Check } from 'lucide-react';
import { getDelayDays } from '@/lib/dateUtils';
import { StatusType } from '@/types';
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
  status: StatusType;
  ownerName?: string;
  ownerAvatar?: string;
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

const ALL_STATUSES: StatusType[] = ['todo', 'in-progress', 'qa', 'done', 'canceled', 'blocked'];

const STATUS_LABELS: Record<StatusType, string> = {
  'todo':        'To Do',
  'in-progress': 'In Progress',
  'qa':          'QA',
  'done':        'Done',
  'canceled':    'Canceled',
  'blocked':     'Blocked',
};

const STATUS_DOT: Record<StatusType, string> = {
  'todo':        'bg-slate-500',
  'in-progress': 'bg-violet-500',
  'qa':          'bg-blue-500',
  'done':        'bg-emerald-500',
  'canceled':    'bg-slate-600',
  'blocked':     'bg-orange-500',
};

interface GanttTaskPanelProps {
  visibleRows: VisibleRow[];
  onScrollY: (scrollTop: number) => void;
  onAddFeature: (epicId: string) => void;
  onAddTask: (epicId: string, featureId: string) => void;
}

const PANEL_MIN = 200;
const PANEL_MAX = 700;
const PANEL_DEFAULT = 460;

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
          className="sticky top-0 z-20 flex items-center border-b border-white/[0.06] bg-[#0d1117] text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0"
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
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600 text-xs">
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
            isResizing ? 'bg-violet-500' : 'bg-white/[0.06] group-hover:bg-violet-500/60',
          )} />
        </div>
      </div>
    );
  }
);

// ─── AddRow ──────────────────────────────────────────────────────────────────

const ADD_ROW_CONFIG = {
  epic:    { label: 'New Epic',    indent: 'pl-3',    accent: 'border-violet-500/40 text-violet-400/70 hover:text-violet-300 hover:bg-violet-500/5' },
  feature: { label: 'New Feature', indent: 'pl-8',    accent: 'border-blue-500/30 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/5' },
  task:    { label: 'New Task',    indent: 'pl-[52px]', accent: 'border-slate-500/30 text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]' },
};

function AddRow({ row }: { row: VisibleRow }) {
  const cfg = ADD_ROW_CONFIG[row.level];
  return (
    <button
      onClick={row.addRowCallback}
      className={cn(
        'w-full flex items-center gap-2 border-b border-white/[0.03] transition-colors group',
        cfg.indent,
        cfg.accent,
      )}
      style={{ height: ROW_H }}
    >
      <span className="flex items-center justify-center w-4 h-4 rounded border border-dashed border-current opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        <Plus size={9} />
      </span>
      <span className="text-[11px] font-medium opacity-60 group-hover:opacity-100 transition-opacity">
        {cfg.label}
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
  onStatusChange: (s: StatusType) => void;
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
  onPctChange,
  onNameChange,
}: TaskRowProps) {
  const delayDays = getDelayDays(row.plannedEnd, row.actualEnd);
  const isLate = delayDays > 0 && row.status !== 'done' && row.status !== 'canceled';

  return (
    <div
      className={cn(
        'flex items-center border-b border-white/[0.04] group text-xs relative',
        row.level === 'epic' && 'bg-white/[0.02]',
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
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0 flex items-center justify-center">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isLate ? 'bg-red-500' : 'bg-slate-600'
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
            isLate ? 'text-red-300' : 'text-slate-200',
            row.level === 'epic' && 'text-white font-semibold text-[12px]',
            row.level === 'feature' && 'text-slate-100 font-medium',
          )}
        />
      </div>

      {/* Owner */}
      <div className="w-7 flex items-center justify-center shrink-0">
        <OwnerAvatar name={row.ownerName} />
      </div>

      {/* Status (click to edit) */}
      <div className="w-[88px] flex items-center justify-center shrink-0">
        {readonly ? (
          <StatusBadge status={row.status} />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded hover:ring-1 hover:ring-white/20 transition-all">
                <StatusBadge status={row.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-[#1a2030] border-white/10 text-slate-200 text-xs min-w-[140px]"
              align="center"
            >
              {ALL_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={cn(
                    'cursor-pointer text-xs hover:bg-white/[0.07] gap-2',
                    s === row.status && 'text-violet-300'
                  )}
                >
                  {s === row.status && <Check size={10} />}
                  {s !== row.status && <span className="w-2.5" />}
                  <span className="flex-1">{STATUS_LABELS[s]}</span>
                  <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[s])} />
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
          <span className="text-[11px] text-slate-400">{row.completionPct}%</span>
        )}
      </div>

      {/* Row actions (hover) */}
      {!readonly && (
        <div className="w-16 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {row.level !== 'task' && (
            <button
              onClick={onAddChild}
              className="p-1.5 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
              title={row.level === 'epic' ? 'Add feature' : 'Add task'}
            >
              <Plus size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Mini progress bar at row bottom */}
      {row.completionPct > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.04]">
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
        className={cn("text-left overflow-hidden min-w-0 flex-1", !readonly && "hover:bg-white/[0.06] rounded px-1 -ml-1 transition-colors")}
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
      className="flex-1 bg-white/[0.08] border border-violet-500/50 rounded px-1 -ml-1 outline-none text-[inherit] font-[inherit]"
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
        className="text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition-colors tabular-nums"
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
      className="w-12 text-[11px] text-white bg-white/[0.08] border border-violet-500/50 rounded px-1 py-0.5 text-center outline-none tabular-nums"
      autoFocus
    />
  );
}

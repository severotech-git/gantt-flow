'use client';

import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { TimelineScale } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, ChevronDown, History, Search, Plus, Crosshair, Loader2, PanelLeftClose, PanelLeftOpen, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultStartDate } from '@/lib/dateUtils';
import { useState } from 'react';

const SCALES: { value: TimelineScale; label: string }[] = [
  { value: 'week',    label: 'Week'    },
  { value: 'month',   label: 'Month'   },
  { value: 'quarter', label: 'Quarter' },
];

interface TopNavProps {
  onSaveVersion: () => void;
  onNewProject: () => void;
  onSearch: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopNav({ onSaveVersion, onNewProject, onSearch, sidebarOpen, onToggleSidebar }: TopNavProps) {
  const {
    timelineScale,
    setTimelineScale,
    setTimelineStartDate,
    versions,
    loadVersion,
    clearVersion,
    deleteVersion,
    restoreVersion,
    isVersionReadOnly,
    activeVersion,
    isSaving,
  } = useProjectStore();

  const [versionMenuOpen, setVersionMenuOpen] = useState(false);

  const project = useProjectStore(selectDisplayProject);

  return (
    <header className="flex items-center h-12 px-4 gap-3 border-b border-border bg-surface-2 shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* Project name */}
      <h1 className="font-semibold text-sm text-foreground truncate mr-2">
        {project?.name ?? 'Select a project'}
      </h1>

      {/* Scale toggles */}
      <div className="flex items-center bg-accent/60 rounded-md p-0.5 gap-0">
        {SCALES.map((s) => (
          <button
            key={s.value}
            onClick={() => setTimelineScale(s.value)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              timelineScale === s.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Read-only banner */}
      {isVersionReadOnly && (
        <div className="flex items-center text-xs font-medium">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-l-md bg-amber-500/10 border border-amber-500/30 border-r-0 text-amber-600 dark:text-amber-400">
            <Eye size={12} className="shrink-0" />
            {activeVersion?.versionName}
          </span>
          <button
            onClick={clearVersion}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-r-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            Back to live
          </button>
        </div>
      )}

      {/* Jump to today */}
      <button
        onClick={() => setTimelineStartDate(getDefaultStartDate(timelineScale))}
        title="Jump to today"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors"
      >
        <Crosshair size={12} />
        Today
      </button>

      <div className="flex-1" />

      {/* Saving indicator */}
      {isSaving && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 size={11} className="animate-spin" />
          Saving…
        </span>
      )}

      {/* Search */}
      <button
        onClick={onSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors min-w-[160px]"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] text-muted-foreground/60 font-sans">⌘K</kbd>
      </button>

      {/* Version picker */}
      {project && (
        <DropdownMenu open={versionMenuOpen} onOpenChange={setVersionMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-accent/40 border border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <History size={12} />
              {activeVersion ? activeVersion.versionName : 'Live'}
              <ChevronDown size={11} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-xs">Versions</DropdownMenuLabel>

            {/* Live entry */}
            <DropdownMenuItem
              onSelect={() => { clearVersion(); setVersionMenuOpen(false); }}
              className={cn('text-xs cursor-pointer gap-2', !isVersionReadOnly && 'text-violet-500 font-medium')}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', !isVersionReadOnly ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
              Live
            </DropdownMenuItem>

            {versions.length > 0 && <DropdownMenuSeparator />}

            {/* Snapshot entries */}
            {versions.map((v) => (
              <DropdownMenuItem
                key={v._id}
                onSelect={(e) => e.preventDefault()}
                className={cn(
                  'text-xs cursor-pointer gap-2 group/item pr-1',
                  activeVersion?._id === v._id && 'text-amber-500 font-medium'
                )}
              >
                {/* Name — click to view */}
                <button
                  className="flex-1 text-left truncate"
                  onClick={() => { loadVersion(v._id); setVersionMenuOpen(false); }}
                >
                  {v.versionName}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { restoreVersion(v._id); setVersionMenuOpen(false); }}
                    title="Restore as live"
                    className="p-1 rounded hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-muted-foreground transition-colors"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => deleteVersion(v._id)}
                    title="Delete snapshot"
                    className="p-1 rounded hover:bg-red-500/15 hover:text-red-500 text-muted-foreground transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Save Snapshot */}
      {!isVersionReadOnly && project && (
        <Button size="sm" onClick={onSaveVersion} className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5">
          <Camera size={12} />
          Save Snapshot
        </Button>
      )}

      {/* New Project */}
      <Button size="sm" variant="outline" onClick={onNewProject} className="h-7 px-3 text-xs gap-1">
        <Plus size={12} />
        New Project
      </Button>
    </header>
  );
}

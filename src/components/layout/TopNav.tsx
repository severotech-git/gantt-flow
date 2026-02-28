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
import { Camera, ChevronDown, History, Search, Plus, Crosshair, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultStartDate } from '@/lib/dateUtils';

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
    isVersionReadOnly,
    activeVersion,
    isSaving,
  } = useProjectStore();

  const project = useProjectStore(selectDisplayProject);

  return (
    <header className="flex items-center h-12 px-4 gap-3 border-b border-white/[0.06] bg-[#0d1117] shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
      </button>

      {/* Project name */}
      <h1 className="font-semibold text-sm text-white truncate mr-2">
        {project?.name ?? 'Select a project'}
      </h1>

      {/* Scale toggles */}
      <div className="flex items-center bg-white/[0.06] rounded-md p-0.5 gap-0">
        {SCALES.map((s) => (
          <button
            key={s.value}
            onClick={() => setTimelineScale(s.value)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              timelineScale === s.value
                ? 'bg-white/[0.12] text-white'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Read-only banner */}
      {isVersionReadOnly && (
        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-900/40 border border-amber-700/40 text-amber-400 text-xs font-medium">
          <History size={12} />
          Viewing: {activeVersion?.versionName}
          <button
            onClick={clearVersion}
            className="ml-1 text-amber-300 hover:text-amber-100 underline text-[11px]"
          >
            Back to live
          </button>
        </span>
      )}

      {/* Jump to today */}
      <button
        onClick={() => setTimelineStartDate(getDefaultStartDate(timelineScale))}
        title="Jump to today"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] border border-white/[0.07] rounded-md hover:bg-white/[0.07] transition-colors"
      >
        <Crosshair size={12} />
        Today
      </button>

      <div className="flex-1" />

      {/* Saving indicator */}
      {isSaving && (
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <Loader2 size={11} className="animate-spin" />
          Saving…
        </span>
      )}

      {/* Search */}
      <button
        onClick={onSearch}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-white/[0.05] border border-white/[0.08] rounded-md hover:bg-white/[0.08] transition-colors min-w-[160px]"
      >
        <Search size={12} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] text-slate-600 font-sans">⌘K</kbd>
      </button>

      {/* Version picker */}
      {project && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white/[0.05] border border-white/[0.08] rounded-md text-slate-300 hover:bg-white/[0.08] transition-colors">
              <History size={12} className="text-slate-400" />
              {activeVersion ? activeVersion.versionName : project.currentVersion}
              <ChevronDown size={11} className="text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#161b22] border-white/[0.1] text-slate-200 w-52"
          >
            <DropdownMenuLabel className="text-slate-500 text-xs">Versions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={clearVersion}
              className={cn(
                'text-xs cursor-pointer hover:bg-white/[0.07]',
                !isVersionReadOnly && 'text-violet-400 font-medium'
              )}
            >
              {project.currentVersion}
            </DropdownMenuItem>
            {versions.length > 0 && <DropdownMenuSeparator className="bg-white/[0.08]" />}
            {versions.map((v) => (
              <DropdownMenuItem
                key={v._id}
                onClick={() => loadVersion(v._id)}
                className={cn(
                  'text-xs cursor-pointer hover:bg-white/[0.07]',
                  activeVersion?._id === v._id && 'text-amber-400 font-medium'
                )}
              >
                {v.versionName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Save Snapshot */}
      {!isVersionReadOnly && project && (
        <Button
          size="sm"
          onClick={onSaveVersion}
          className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
        >
          <Camera size={12} />
          Save Snapshot
        </Button>
      )}

      {/* New Project */}
      <Button
        size="sm"
        variant="outline"
        onClick={onNewProject}
        className="h-7 px-3 text-xs border-white/[0.12] text-slate-300 hover:bg-white/[0.07] gap-1"
      >
        <Plus size={12} />
        New Project
      </Button>
    </header>
  );
}

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
import { Camera, ChevronDown, History, Crosshair, Loader2, Eye, RotateCcw, Trash2, BarChart3, Columns3, CalendarDays, CalendarRange, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PageNavbar } from '@/components/layout/PageNavbar';
import { PresenceAvatars } from './PresenceAvatars';
import { useTranslations } from 'next-intl';

const SCALE_VALUES: TimelineScale[] = ['week', 'month', 'quarter'];
const SCALE_ICONS = { week: CalendarDays, month: CalendarRange, quarter: Layers };

interface TopNavbarProps {
  onSaveVersion: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopNavbar({ onSaveVersion, sidebarOpen, onToggleSidebar }: TopNavbarProps) {
  const t = useTranslations('gantt.topnav');
  const {
    timelineScale,
    setTimelineScale,
    jumpToToday,
    versions,
    loadVersion,
    clearVersion,
    deleteVersion,
    restoreVersion,
    isVersionReadOnly,
    activeVersion,
    isSaving,
  } = useProjectStore();

  const viewMode = useProjectStore((s) => s.viewMode);
  const setViewMode = useProjectStore((s) => s.setViewMode);

  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const project = useProjectStore(selectDisplayProject);

  // ── Slot: next to title ──────────────────────────────────────────────────
  const titleActions = (
    <>
      {/* View mode toggle */}
      <div className="flex items-center bg-accent/60 rounded-md p-0.5 gap-0 shrink-0">
        <button
          onClick={() => setViewMode('gantt')}
          title={t('views.gantt')}
          className={cn(
            'p-2 lg:px-3 lg:py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5',
            viewMode === 'gantt'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 size={13} className="shrink-0" />
          <span className="hidden lg:inline">{t('views.gantt')}</span>
        </button>
        <button
          onClick={() => { if (isVersionReadOnly) clearVersion(); setViewMode('kanban'); }}
          title={t('views.kanban')}
          className={cn(
            'p-2 lg:px-3 lg:py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5',
            viewMode === 'kanban'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Columns3 size={13} className="shrink-0" />
          <span className="hidden lg:inline">{t('views.kanban')}</span>
        </button>
      </div>

      {/* Separator */}
      {viewMode === 'gantt' && <div className="w-px h-5 bg-border shrink-0" />}

      {/* Scale toggles — Gantt only */}
      {viewMode === 'gantt' && (
        <div className="flex items-center bg-accent/60 rounded-md p-0.5 gap-0 shrink-0">
          {SCALE_VALUES.map((value) => {
            const Icon = SCALE_ICONS[value];
            return (
              <button
                key={value}
                onClick={() => setTimelineScale(value)}
                title={t(`scales.${value}`)}
                className={cn(
                  'p-2 lg:px-3 lg:py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5',
                  timelineScale === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={13} className="shrink-0" />
                <span className="hidden lg:inline">{t(`scales.${value}`)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Read-only version banner — Gantt only, hidden on small screens */}
      {viewMode === 'gantt' && isVersionReadOnly && (
        <div className="hidden sm:flex items-center text-xs font-medium shrink-0">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-l-md bg-warning/10 border border-warning/30 border-r-0 text-warning-foreground">
            <Eye size={12} className="shrink-0" />
            <span className="hidden md:inline">{activeVersion?.versionName}</span>
          </span>
          <button
            onClick={clearVersion}
            className="flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-r-md bg-success/10 border border-success/30 text-success-foreground hover:bg-success/20 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
            <span className="hidden md:inline">{t('backToLive')}</span>
          </button>
        </div>
      )}

      {/* Jump to today — Gantt only */}
      {viewMode === 'gantt' && (
        <button
          onClick={jumpToToday}
          title={t('jumpToToday')}
          className="flex items-center gap-1.5 p-2 xl:px-2 xl:py-1.5 text-xs text-muted-foreground hover:text-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors shrink-0"
        >
          <Crosshair size={13} />
          <span className="hidden xl:inline">{t('today')}</span>
        </button>
      )}
    </>
  );

  // ── Slot: right side ─────────────────────────────────────────────────────
  const actions = (
    <>
      {/* Connected users */}
      <PresenceAvatars />

      {/* Saving indicator */}
      {isSaving && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 size={11} className="animate-spin" />
          {t('saving')}
        </span>
      )}

      {/* Version picker — Gantt only */}
      {viewMode === 'gantt' && project && (
        <DropdownMenu open={versionMenuOpen} onOpenChange={setVersionMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-accent/40 border border-border rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <History size={12} />
              {activeVersion ? activeVersion.versionName : t('live')}
              <ChevronDown size={11} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-xs">{t('versions')}</DropdownMenuLabel>

            <DropdownMenuItem
              onSelect={() => { clearVersion(); setVersionMenuOpen(false); }}
              className={cn('text-xs cursor-pointer gap-2', !isVersionReadOnly && 'text-blue-500 font-medium')}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', !isVersionReadOnly ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
              {t('live')}
            </DropdownMenuItem>

            {(versions && versions.length > 0) && <DropdownMenuSeparator />}

            {(versions || []).map((v) => (
              <DropdownMenuItem
                key={v._id}
                onSelect={(e) => e.preventDefault()}
                className={cn(
                  'text-xs cursor-pointer gap-2 group/item pr-1',
                  activeVersion?._id === v._id && 'text-amber-500 font-medium'
                )}
              >
                <button
                  className="flex-1 text-left truncate"
                  onClick={() => { loadVersion(v._id); setVersionMenuOpen(false); }}
                >
                  {v.versionName}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => { restoreVersion(v._id); setVersionMenuOpen(false); }}
                    title={t('restoreAsLive')}
                    className="p-1 rounded hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-muted-foreground transition-colors"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => deleteVersion(v._id)}
                    title={t('deleteSnapshot')}
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

      {/* Save Snapshot — Gantt only */}
      {viewMode === 'gantt' && !isVersionReadOnly && project && (
        <Button size="sm" onClick={onSaveVersion} className="h-7 px-2 xl:px-3 text-xs gap-1.5 shrink-0">
          <Camera size={12} />
          <span className="hidden xl:inline">{t('saveSnapshot')}</span>
        </Button>
      )}

    </>
  );

  return (
    <PageNavbar
      title={project?.name ?? 'Searching...'}
      titleColor={project?.color ?? undefined}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      titleActions={titleActions}
      actions={actions}
    />
  );
}

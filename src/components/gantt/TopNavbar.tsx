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
import { Camera, ChevronDown, History, Search, Crosshair, Loader2, Eye, RotateCcw, Trash2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { PageNavbar } from '@/components/layout/PageNavbar';
import { PresenceAvatars } from './PresenceAvatars';
import { useTranslations } from 'next-intl';
import { ShareDialog } from '@/components/dialogs/ShareDialog';

const SCALE_VALUES: TimelineScale[] = ['week', 'month', 'quarter'];

interface TopNavbarProps {
  onSaveVersion: () => void;
  onSearch: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopNavbar({ onSaveVersion, onSearch, sidebarOpen, onToggleSidebar }: TopNavbarProps) {
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

  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const project = useProjectStore(selectDisplayProject);

  // ── Slot: next to title ──────────────────────────────────────────────────
  const titleActions = (
    <>
      {/* Scale toggles */}
      <div className="flex items-center bg-accent/60 rounded-md p-0.5 gap-0">
        {SCALE_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setTimelineScale(value)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              timelineScale === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`scales.${value}`)}
          </button>
        ))}
      </div>

      {/* Read-only version banner */}
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
            {t('backToLive')}
          </button>
        </div>
      )}

      {/* Jump to today */}
      <button
        onClick={jumpToToday}
        title={t('jumpToToday')}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors"
      >
        <Crosshair size={12} />
        {t('today')}
      </button>
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

      {/* Search + Share */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-accent/40 border border-border rounded-md hover:bg-accent transition-colors min-w-[160px]"
        >
          <Search size={12} />
          <span className="flex-1 text-left">{t('searchPlaceholder')}</span>
          <kbd className="text-[10px] text-muted-foreground/60 font-sans">⌘K</kbd>
        </button>

        {/* Share */}
        {!isVersionReadOnly && project && (
          <Button size="sm" variant="outline" onClick={() => setShareOpen(true)} className="h-7 px-3 text-xs gap-1">
            <Share2 size={12} />
            {t('share')}
          </Button>
        )}
      </div>

      {/* Version picker */}
      {project && (
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

      {/* Save Snapshot */}
      {!isVersionReadOnly && project && (
        <Button size="sm" onClick={onSaveVersion} className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5">
          <Camera size={12} />
          {t('saveSnapshot')}
        </Button>
      )}
    </>
  );

  return (
    <>
      <PageNavbar
        title={project?.name ?? 'Searching...'}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        titleActions={titleActions}
        actions={actions}
      />
      {project && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={project._id}
        />
      )}
    </>
  );
}

'use client';

import React from 'react';
import { Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { IEpic, IUserConfig } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface KanbanFilters {
  epicId: string | null;
  assigneeId: string | null;
  onlyOverdue: boolean;
  hideDone: boolean;
  search: string;
}

export const DEFAULT_KANBAN_FILTERS: KanbanFilters = {
  epicId: null, assigneeId: null, onlyOverdue: false, hideDone: false, search: '',
};

interface KanbanToolbarProps {
  epics: IEpic[];
  filters: KanbanFilters;
  onFiltersChange: (filters: KanbanFilters) => void;
  users?: IUserConfig[];
  rightSlot?: React.ReactNode;
}

export function KanbanToolbar({ epics, filters, onFiltersChange, users: propUsers, rightSlot }: KanbanToolbarProps) {
  const t = useTranslations('kanban');
  const levelNames = useSettingsStore((s) => s.levelNames);
  const storeUsers = useSettingsStore((s) => s.users);
  const users = propUsers ?? storeUsers;

  const hasActiveFilters =
    filters.epicId !== null ||
    filters.assigneeId !== null ||
    filters.onlyOverdue ||
    filters.hideDone ||
    filters.search !== '';

  function set(partial: Partial<KanbanFilters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function clearAll() {
    onFiltersChange({ epicId: null, assigneeId: null, onlyOverdue: false, hideDone: false, search: '' });
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60 bg-background shrink-0 overflow-x-auto">
      {/* Search */}
      <div className="relative flex-shrink-0 w-44">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder={t('filterSearch')}
          className="h-7 pl-7 text-xs"
        />
      </div>

      <div className="h-4 w-px bg-border/60 shrink-0" />

      {/* Epic filter */}
      {epics.length > 1 && (
        <Select
          value={filters.epicId ?? 'all'}
          onValueChange={(v) => set({ epicId: v === 'all' ? null : v })}
        >
          <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[130px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              {t('allEpics', { epicLabel: levelNames.epic })}
            </SelectItem>
            {epics.map((epic) => (
              <SelectItem key={epic._id} value={epic._id} className="text-xs">
                <span className="flex items-center gap-1.5">
                  {epic.color && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: epic.color }} />
                  )}
                  {epic.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Assignee filter */}
      {users.length > 0 && (
        <Select
          value={filters.assigneeId ?? 'all'}
          onValueChange={(v) => set({ assigneeId: v === 'all' ? null : v })}
        >
          <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[130px] shrink-0">
            <SelectValue placeholder={t('allAssignees')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              {t('allAssignees')}
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.uid} value={user.uid} className="text-xs">
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Overdue toggle */}
      <button
        onClick={() => set({ onlyOverdue: !filters.onlyOverdue })}
        title={t('filterOverdue')}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors shrink-0',
          filters.onlyOverdue
            ? 'bg-destructive/15 border-destructive/40 text-destructive'
            : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/60'
        )}
      >
        <AlertCircle size={11} />
        {t('filterOverdue')}
      </button>

      {/* Hide done toggle */}
      <button
        onClick={() => set({ hideDone: !filters.hideDone })}
        title={t('filterHideDone')}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors shrink-0',
          filters.hideDone
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/60'
        )}
      >
        <CheckCircle2 size={11} />
        {t('filterHideDone')}
      </button>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors shrink-0"
        >
          <X size={11} />
          {t('clearFilters')}
        </button>
      )}

      {rightSlot && (
        <>
          <div className="flex-1" />
          <div className="h-4 w-px bg-border/60 shrink-0" />
          {rightSlot}
        </>
      )}

    </div>
  );
}

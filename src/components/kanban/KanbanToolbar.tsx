'use client';

import { useTranslations } from 'next-intl';
import { IEpic } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type GroupBy = 'none' | 'epic' | 'feature';

interface KanbanToolbarProps {
  epics: IEpic[];
  selectedEpicId: string | null;
  onSelectEpic: (epicId: string | null) => void;
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
}

export function KanbanToolbar({
  epics,
  selectedEpicId,
  onSelectEpic,
  groupBy,
  onGroupByChange,
}: KanbanToolbarProps) {
  const t = useTranslations('kanban');
  const levelNames = useSettingsStore((s) => s.levelNames);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border/60 bg-background shrink-0">
      {/* Epic filter */}
      {epics.length > 1 && (
        <Select
          value={selectedEpicId ?? 'all'}
          onValueChange={(v) => onSelectEpic(v === 'all' ? null : v)}
        >
          <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[140px] gap-1.5">
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
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: epic.color }}
                    />
                  )}
                  {epic.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Group by */}
      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">
            {t('noGrouping')}
          </SelectItem>
          <SelectItem value="epic" className="text-xs">
            {t('groupByEpic', { epicLabel: levelNames.epic })}
          </SelectItem>
          <SelectItem value="feature" className="text-xs">
            {t('groupByFeature', { featureLabel: levelNames.feature })}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

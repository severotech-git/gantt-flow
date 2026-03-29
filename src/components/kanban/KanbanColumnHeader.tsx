'use client';

import { IStatusConfig } from '@/types';
import { cn } from '@/lib/utils';

interface KanbanColumnHeaderProps {
  status: IStatusConfig;
  count: number;
}

export function KanbanColumnHeader({ status, count }: KanbanColumnHeaderProps) {
  const isHighLoad = count > 12;
  const isMediumLoad = count > 8;

  return (
    <div
      className="sticky top-0 z-10 bg-background border-b border-border/60 border-t-[3px]"
      style={{ borderTopColor: status.color }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground truncate flex-1">
          {status.label}
        </span>
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-colors',
            isHighLoad
              ? 'bg-destructive/20 text-destructive'
              : isMediumLoad
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              : 'bg-accent/60 text-muted-foreground'
          )}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

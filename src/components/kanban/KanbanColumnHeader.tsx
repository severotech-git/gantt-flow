'use client';

import { IStatusConfig } from '@/types';

interface KanbanColumnHeaderProps {
  status: IStatusConfig;
}

/**
 * Sticky global column label for the Kanban board header row.
 * Shows status label with a top color-accent border.
 */
export function KanbanColumnHeader({ status }: KanbanColumnHeaderProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-r border-border/20 last:border-r-0 border-t-[3px] bg-background"
      style={{ borderTopColor: status.color }}
    >
      <span className="text-xs font-semibold text-foreground truncate">
        {status.label}
      </span>
    </div>
  );
}

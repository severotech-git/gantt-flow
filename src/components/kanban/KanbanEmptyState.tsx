'use client';

import { SquareKanban } from 'lucide-react';

interface KanbanEmptyStateProps {
  message: string;
  subtitle?: string;
  variant?: 'board' | 'column';
}

export function KanbanEmptyState({ message, subtitle, variant = 'board' }: KanbanEmptyStateProps) {
  if (variant === 'column') {
    return (
      <div className="flex items-center justify-center py-8 px-3 text-xs text-muted-foreground/50 select-none">
        {message}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center select-none">
      <SquareKanban size={36} className="text-muted-foreground/20" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statuses = useSettingsStore((s) => s.statuses);
  const config = statuses.find((s) => s.value === status);
  const label = config?.label ?? status;
  const color = config?.color ?? '#475569';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white',
        className
      )}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

// Legacy helper — now returns hex color string from store; kept for GanttBar compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getBarColor(status: string): string {
  // This is a synchronous fallback; GanttBar reads directly from store now
  return '#64748b';
}

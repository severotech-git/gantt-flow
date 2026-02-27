'use client';

import { StatusType } from '@/types';
import { cn } from '@/lib/utils';

const CONFIG: Record<StatusType, { label: string; className: string }> = {
  todo:          { label: 'TO DO',    className: 'bg-slate-700 text-slate-300' },
  'in-progress': { label: 'IN PROG',  className: 'bg-violet-700 text-violet-100' },
  qa:            { label: 'QA',       className: 'bg-blue-700 text-blue-100' },
  done:          { label: 'DONE',     className: 'bg-emerald-700 text-emerald-100' },
  canceled:      { label: 'CANCELED', className: 'bg-slate-600 text-slate-400' },
  blocked:       { label: 'BLOCKED',  className: 'bg-red-700 text-red-100' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, className: colorClass } = CONFIG[status] ?? CONFIG.todo;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

export function getBarColor(status: StatusType): string {
  const map: Record<StatusType, string> = {
    todo:          'bg-slate-500',
    'in-progress': 'bg-violet-500',
    qa:            'bg-blue-500',
    done:          'bg-emerald-500',
    canceled:      'bg-slate-600',
    blocked:       'bg-red-500',
  };
  return map[status] ?? 'bg-slate-500';
}

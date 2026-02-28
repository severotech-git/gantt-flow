'use client';

import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

export function CalendarSection() {
  const { allowWeekends, setAllowWeekends } = useSettingsStore();

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Configure scheduling rules that apply when creating or moving items.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setAllowWeekends(!allowWeekends)}
        className={cn(
          'w-full flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
          allowWeekends
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-border bg-muted/20 hover:border-border/80'
        )}
      >
        <div className={cn(
          'mt-0.5 flex items-center justify-center w-8 h-8 rounded-md shrink-0',
          allowWeekends ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'
        )}>
          <CalendarDays size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">Allow weekend dates</span>
            {/* Toggle pill */}
            <div className={cn(
              'relative shrink-0 w-9 h-5 rounded-full transition-colors',
              allowWeekends ? 'bg-violet-500' : 'bg-muted-foreground/30'
            )}>
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                allowWeekends && 'translate-x-4'
              )} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {allowWeekends
              ? 'Tasks can start and end on Saturdays and Sundays.'
              : 'Start dates snap to Monday, end dates snap to Friday when a weekend is selected or dragged to.'}
          </p>
        </div>
      </button>
    </div>
  );
}

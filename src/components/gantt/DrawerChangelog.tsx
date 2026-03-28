'use client';

import { useState, useEffect } from 'react';
import { useFormatter } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { IChangelogEntry, IUserConfig } from '@/types';

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  status: 'Status',
  ownerId: 'Owner',
  completionPct: 'Progress',
  plannedStart: 'Planned Start',
  plannedEnd: 'Planned End',
  actualStart: 'Actual Start',
  actualEnd: 'Actual End',
  description: 'Description',
};

// Fields where old/new values are long text — show truncated summary instead of full diff
const LONG_TEXT_FIELDS = new Set(['description', 'name']);
const MAX_DIFF_LENGTH = 60;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

interface DrawerChangelogProps {
  projectId: string;
  epicId: string;
  featureId?: string;
  taskId?: string;
  users: IUserConfig[];
  refreshKey: number;
  emptyLabel: string;
  unknownLabel: string;
}

export function DrawerChangelog({
  projectId,
  epicId,
  featureId,
  taskId,
  users,
  refreshKey,
  emptyLabel,
  unknownLabel,
}: DrawerChangelogProps) {
  const format = useFormatter();
  const [{ loading, entries }, setFetchState] = useState<{ loading: boolean; entries: IChangelogEntry[] }>({ loading: true, entries: [] });

  const userMap = Object.fromEntries(users.map((u) => [u.uid, u]));
  const userByName = Object.fromEntries(users.map((u) => [u.name, u]));

  useEffect(() => {
    const params = new URLSearchParams({ epicId });
    if (featureId) params.set('featureId', featureId);
    if (taskId) params.set('taskId', taskId);

    let active = true;
    fetch(`/api/projects/${projectId}/changelog?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setFetchState({ loading: false, entries: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (active) setFetchState((s) => ({ ...s, loading: false }));
      });
    return () => {
      active = false;
      setFetchState((s) => ({ ...s, loading: true }));
    };
  }, [projectId, epicId, featureId, taskId, refreshKey]);

  const formatValue = (field: string, value: string | null): string => {
    if (value === null || value === '' || value === 'undefined') return '—';
    if (['plannedStart', 'plannedEnd', 'actualStart', 'actualEnd'].includes(field)) {
      try { return new Date(value).toLocaleDateString(); } catch { return value; }
    }
    if (field === 'completionPct') return `${value}%`;
    if (field === 'ownerId') {
      const user = userMap[value] || userByName[value];
      return user ? user.name : unknownLabel;
    }
    if (LONG_TEXT_FIELDS.has(field)) return truncate(value, MAX_DIFF_LENGTH);
    return value;
  };

  return (
    <ScrollArea className="flex-1 min-h-0 h-full">
      <div className="px-5 py-5 space-y-5">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">{emptyLabel}</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const user = userMap[entry.userId] || userByName[entry.userId];
            const userName = user?.name || entry.userId || unknownLabel;
            const relativeTime = format.relativeTime(new Date(entry.changedAt), new Date());
            const fieldLabel = FIELD_LABELS[entry.field] ?? entry.field;
            const oldVal = formatValue(entry.field, entry.oldValue);
            const newVal = formatValue(entry.field, entry.newValue);
            const isLongText = LONG_TEXT_FIELDS.has(entry.field);

            return (
              <div key={entry._id ?? i} className="flex gap-3 items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <OwnerAvatar name={userName} color={user?.color} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Summary line */}
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{userName}</span>
                    <span className="text-muted-foreground"> updated </span>
                    <span className="font-medium">{fieldLabel}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>

                  {/* Diff block */}
                  {isLongText ? (
                    <div className="mt-2 space-y-1">
                      {oldVal !== '—' && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <span className="shrink-0 w-3 text-red-400 font-bold mt-px">−</span>
                          <span className="text-muted-foreground line-through break-words">{oldVal}</span>
                        </div>
                      )}
                      {newVal !== '—' && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <span className="shrink-0 w-3 text-emerald-500 font-bold mt-px">+</span>
                          <span className="text-foreground break-words">{newVal}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                      <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded line-through">{oldVal}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">{newVal}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

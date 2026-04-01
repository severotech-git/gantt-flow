'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSession } from 'next-auth/react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { cn } from '@/lib/utils';
import { IEpic, IFeature, ITask, IUserConfig } from '@/types';
import { SendIcon, PencilIcon } from 'lucide-react';
import { parseISO } from 'date-fns';
import { snapToWorkday } from '@/lib/dateUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DrawerChangelog } from '@/components/gantt/DrawerChangelog';
import { MentionTextarea } from '@/components/shared/MentionTextarea';

type ItemLevel = 'epic' | 'feature' | 'task';
interface ItemRef {
  level: ItemLevel;
  epicId: string;
  featureId?: string;
  taskId?: string;
  data: IEpic | IFeature | ITask;
}

export function ItemDetailDrawer() {
  const t = useTranslations('gantt.drawer');
  const { data: session } = useSession();

  const {
    openItemRef,
    closeItem,
    activeProject,
    updateEpic,
    updateFeature,
    updateTask,
    addComment,
  } = useProjectStore();

  const users = useSettingsStore((s) => s.users);
  const statuses = useSettingsStore((s) => s.statuses);
  const levelNames = useSettingsStore((s) => s.levelNames);

  // Get current user's uid by matching session user name with workspace users
  const currentUserUid = useMemo(() => {
    if (!session?.user?.name) return '';
    // Find user by exact name match in workspace
    const user = users.find((u) => u.name === session.user.name);
    return user?.uid || session.user.name;
  }, [session, users]);

  // Derive the item from openItemRef
  const item = useMemo(() => {
    if (!openItemRef || !activeProject) return null;
    const { epicId, featureId, taskId } = openItemRef;
    const epic = activeProject.epics.find((e) => e._id === epicId);
    if (!epic) return null;
    if (!featureId) {
      return {
        level: 'epic' as const,
        epicId,
        data: epic,
      };
    }
    const feature = epic.features.find((f) => f._id === featureId);
    if (!feature) return null;
    if (!taskId) {
      return {
        level: 'feature' as const,
        epicId,
        featureId,
        data: feature,
      };
    }
    const task = feature.tasks.find((t) => t._id === taskId);
    if (!task) return null;
    return {
      level: 'task' as const,
      epicId,
      featureId,
      taskId,
      data: task,
    };
  }, [openItemRef, activeProject]) as ItemRef | null;

  // Compute item label (e.g. PROJ-42)
  const itemLabel = useMemo(() => {
    if (!item || !activeProject) return '';
    const prefix = activeProject.name.slice(0, 4).toUpperCase();
    let index = 0;
    for (const epic of activeProject.epics) {
      index++;
      if (epic._id === item.epicId && item.level === 'epic') return `${prefix}-${index}`;
      for (const feature of epic.features) {
        index++;
        if (feature._id === item.featureId && item.level === 'feature') return `${prefix}-${index}`;
        for (const task of feature.tasks) {
          index++;
          if (task._id === item.taskId && item.level === 'task') return `${prefix}-${index}`;
        }
      }
    }
    return `${prefix}-${index}`;
  }, [item, activeProject]);

  const [changelogRefreshKey, setChangelogRefreshKey] = useState(0);

  // Local drafts — updated on every keystroke, committed to store only on blur
  const [nameDraft, setNameDraft] = useState(item?.data.name ?? '');
  const [startDraft, setStartDraft] = useState(item?.data.plannedStart?.split('T')[0] ?? '');
  const [endDraft, setEndDraft] = useState(item?.data.plannedEnd?.split('T')[0] ?? '');
  const [pctDraft, setPctDraft] = useState(String(item?.data.completionPct ?? 0));

  // Reset drafts synchronously during render when a different item is opened
  // or when the store updates the same item's dates/pct from an external source
  // (React re-renders immediately when setState is called during render)
  const [prevItemKey, setPrevItemKey] = useState('');
  const [prevDateKey, setPrevDateKey] = useState('');
  const currentItemKey = `${item?.epicId ?? ''}-${item?.featureId ?? ''}-${item?.taskId ?? ''}`;
  const currentDateKey = `${item?.data.plannedStart ?? ''}|${item?.data.plannedEnd ?? ''}|${item?.data.completionPct ?? 0}`;
  if (currentItemKey !== prevItemKey) {
    setPrevItemKey(currentItemKey);
    setPrevDateKey(currentDateKey);
    setNameDraft(item?.data.name ?? '');
    setStartDraft(item?.data.plannedStart?.split('T')[0] ?? '');
    setEndDraft(item?.data.plannedEnd?.split('T')[0] ?? '');
    setPctDraft(String(item?.data.completionPct ?? 0));
  } else if (currentDateKey !== prevDateKey) {
    // Same item, but dates/pct changed in store (e.g., rollup from child or another client)
    setPrevDateKey(currentDateKey);
    setStartDraft(item?.data.plannedStart?.split('T')[0] ?? '');
    setEndDraft(item?.data.plannedEnd?.split('T')[0] ?? '');
    setPctDraft(String(item?.data.completionPct ?? 0));
  }

  // Debounce timers for auto-save on type
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const TRACKED_FIELDS = ['status', 'ownerId', 'completionPct', 'plannedStart', 'plannedEnd', 'actualStart', 'actualEnd', 'description'];

  const writeChangelog = (field: string, oldValue: unknown, newValue: unknown) => {
    if (!item || !activeProject) return;
    const oldStr = oldValue != null ? String(oldValue) : '';
    const newStr = newValue != null ? String(newValue) : '';
    if (oldStr === newStr) return;

    fetch(`/api/projects/${activeProject._id}/changelog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        epicId: item.epicId,
        featureId: item.featureId,
        taskId: item.taskId,
        field,
        oldValue: oldStr || null,
        newValue: newStr || null,
      }),
    })
      .then(() => setChangelogRefreshKey((k) => k + 1))
      .catch(() => {});
  };

  const patchItem = (patch: Partial<IEpic & IFeature & ITask>) => {
    if (!item || !activeProject) return;
    // Track changes for tracked fields (excluding name — handled on blur)
    for (const field of TRACKED_FIELDS) {
      if (field in patch) {
        const oldValue = (item.data as unknown as Record<string, unknown>)[field];
        const newValue = (patch as unknown as Record<string, unknown>)[field];
        writeChangelog(field, oldValue, newValue);
      }
    }

    // Snapshot parent dates before update for rollup changelog
    const epicBefore = activeProject.epics.find((e) => e._id === item.epicId);
    const featBefore = item.featureId
      ? epicBefore?.features.find((f) => f._id === item.featureId)
      : undefined;

    if (item.level === 'epic') updateEpic(item.epicId, patch);
    else if (item.level === 'feature') updateFeature(item.epicId, item.featureId!, patch);
    else updateTask(item.epicId, item.featureId!, item.taskId!, patch);

    // Record rollup changelogs for parent items (set() is synchronous, state is already updated)
    if (item.level !== 'epic') {
      const epicAfter = useProjectStore.getState().activeProject?.epics.find((e) => e._id === item.epicId);
      const featAfter = item.featureId
        ? epicAfter?.features.find((f) => f._id === item.featureId)
        : undefined;

      const postRollup = (featureId: string | undefined, field: string, oldVal: string | number | undefined, newVal: string | number | undefined) => {
        const oldStr = oldVal != null ? String(oldVal) : undefined;
        const newStr = newVal != null ? String(newVal) : undefined;
        if (!oldStr || !newStr || oldStr === newStr) return;
        fetch(`/api/projects/${activeProject._id}/changelog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epicId: item.epicId, featureId, field, oldValue: oldStr, newValue: newStr }),
        })
          .then(() => setChangelogRefreshKey((k) => k + 1))
          .catch(() => {});
      };

      if (item.level === 'task' && item.featureId && featBefore && featAfter) {
        for (const f of ['plannedStart', 'plannedEnd'] as const) {
          postRollup(item.featureId, f, featBefore[f], featAfter[f]);
        }
        postRollup(item.featureId, 'completionPct', featBefore.completionPct, featAfter.completionPct);
      }
      if (epicBefore && epicAfter) {
        for (const f of ['plannedStart', 'plannedEnd'] as const) {
          postRollup(undefined, f, epicBefore[f], epicAfter[f]);
        }
        postRollup(undefined, 'completionPct', epicBefore.completionPct, epicAfter.completionPct);
      }
    }
  };

  return (
    <Sheet open={!!openItemRef} onOpenChange={(open) => { if (!open) closeItem(); }}>
      <SheetContent showCloseButton={false} className="overflow-hidden flex flex-col gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetTitle className="sr-only">{item?.data.name} Details</SheetTitle>
        {item && (
          <Tabs defaultValue="details" className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Fixed header: name + close + tabs */}
            <div className="flex-shrink-0 border-b">
              {/* Title row */}
              <div className="px-5 pt-5 pb-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-primary">
                      {levelNames[item.level]}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{itemLabel}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 group/name">
                    <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNameDraft(val);
                          if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
                          nameTimerRef.current = setTimeout(() => {
                            const next = val.trim() || item.data.name;
                            if (next !== item.data.name) {
                              writeChangelog('name', item.data.name, next);
                              patchItem({ name: next });
                            }
                          }, 600);
                        }}
                        onBlur={() => {
                          const next = nameDraft.trim();
                          if (!next) setNameDraft(item.data.name);
                        }}
                        maxLength={255}
                        className="flex-1 text-lg font-semibold bg-transparent border-0 focus:outline-none p-0 focus:ring-0 leading-snug cursor-text text-foreground hover:text-foreground/80 transition-colors"
                      />
                      <PencilIcon className="w-3.5 h-3.5 text-muted-foreground/0 group-hover/name:text-muted-foreground/50 group-focus-within/name:text-muted-foreground/50 transition-colors shrink-0" />
                    </div>
                    <p className="text-2xs text-muted-foreground/60 shrink-0">{nameDraft.length}/255</p>
                  </div>
                </div>
                <SheetClose className="flex-shrink-0 mt-0.5 rounded-md opacity-60 hover:opacity-100 hover:bg-muted p-1.5 transition-all" />
              </div>

              {/* Tab bar */}
              <TabsList className="w-full rounded-none border-0 bg-transparent h-auto px-5 pb-0 gap-0 justify-start">
                {([
                  ['details', t('detailsTab')],
                  ['activity', t('activityTab')],
                  ['changelog', t('changelogTab')],
                ] as [string, string][]).map(([value, label]) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent text-muted-foreground data-[state=active]:text-foreground px-4 py-2.5 text-sm font-medium"
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Details tab */}
            <TabsContent value="details" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="px-5 py-5 space-y-6">
                  {/* Assignee */}
                  {users.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('assignee')}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => patchItem({ ownerId: undefined })}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                            !item.data.ownerId
                              ? 'border-primary/50 text-primary bg-primary/8'
                              : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                          )}
                        >
                          {t('unassigned')}
                        </button>
                        {users.map((u) => (
                          <button
                            key={u.uid}
                            type="button"
                            onClick={() => patchItem({ ownerId: u.uid })}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                              item.data.ownerId === u.uid
                                ? 'border-primary/50 text-primary bg-primary/8'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                            )}
                          >
                            <OwnerAvatar name={u.name} color={u.color} size={16} />
                            {u.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('startDate')}
                      </label>
                      {item.level === 'epic' ? (
                        <p className="text-sm text-foreground py-1.5">
                          {new Date(item.data.plannedStart).toLocaleDateString()}
                        </p>
                      ) : (
                        <Input
                          type="date"
                          value={startDraft}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStartDraft(val);
                            if (!val) return;
                            const allowWeekends = useSettingsStore.getState().allowWeekends;
                            const newISO = allowWeekends
                              ? new Date(val).toISOString()
                              : snapToWorkday(parseISO(val), 'forward').toISOString();
                            if (newISO !== item.data.plannedStart) patchItem({ plannedStart: newISO });
                          }}
                          onBlur={() => {
                            if (!startDraft) { setStartDraft(item.data.plannedStart.split('T')[0]); }
                          }}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('dueDate')}
                      </label>
                      {item.level === 'epic' ? (
                        <p className="text-sm text-foreground py-1.5">
                          {new Date(item.data.plannedEnd).toLocaleDateString()}
                        </p>
                      ) : (
                        <Input
                          type="date"
                          value={endDraft}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEndDraft(val);
                            if (!val) return;
                            const allowWeekends = useSettingsStore.getState().allowWeekends;
                            const newISO = allowWeekends
                              ? new Date(val).toISOString()
                              : snapToWorkday(parseISO(val), 'backward').toISOString();
                            if (newISO !== item.data.plannedEnd) patchItem({ plannedEnd: newISO });
                          }}
                          onBlur={() => {
                            if (!endDraft) { setEndDraft(item.data.plannedEnd.split('T')[0]); }
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('status')}
                    </label>
                    {item.level === 'epic' ? (
                      (() => {
                        const s = statuses.find((s) => s.value === item.data.status);
                        return s ? (
                          <span
                            className="inline-block px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white"
                            style={{ backgroundColor: s.color }}
                          >
                            {s.label}
                          </span>
                        ) : null;
                      })()
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {statuses.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => patchItem({ status: s.value })}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white transition-all',
                              item.data.status === s.value
                                ? 'ring-2 ring-offset-2 ring-offset-background ring-black/50 dark:ring-white/70 shadow-md scale-105'
                                : 'opacity-60 hover:opacity-90'
                            )}
                            style={{ backgroundColor: s.color }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('progress')}
                    </label>
                    {item.level === 'epic' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground">{item.data.completionPct}%</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, item.data.completionPct))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={pctDraft}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPctDraft(val);
                            if (pctTimerRef.current) clearTimeout(pctTimerRef.current);
                            pctTimerRef.current = setTimeout(() => {
                              const n = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
                              setPctDraft(String(n));
                              if (n !== item.data.completionPct) {
                                writeChangelog('completionPct', item.data.completionPct, n);
                                patchItem({ completionPct: n });
                              }
                            }, 600);
                          }}
                          onBlur={() => {
                            const n = Math.min(100, Math.max(0, parseInt(pctDraft, 10) || 0));
                            setPctDraft(String(n));
                          }}
                          className="w-20 [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, parseInt(pctDraft, 10) || 0))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <DrawerDescription item={item} patchItem={patchItem} />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Activity tab */}
            <TabsContent value="activity" className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0">
              <DrawerActivity
                item={item}
                users={users}
                onComment={(text, mentionedUserIds) => {
                  addComment(item.epicId, item.featureId, item.taskId, text, currentUserUid, mentionedUserIds);
                }}
              />
            </TabsContent>

            {/* Changelog tab */}
            <TabsContent value="changelog" className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0">
              <DrawerChangelog
                projectId={activeProject!._id}
                epicId={item.epicId}
                featureId={item.featureId}
                taskId={item.taskId}
                users={users}
                refreshKey={changelogRefreshKey}
                emptyLabel={t('changelogEmpty')}
                unknownLabel={t('unknownUser')}
              />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DrawerDescription({
  item,
  patchItem,
}: {
  item: ItemRef;
  patchItem: (patch: Partial<IEpic & IFeature & ITask>) => void;
}) {
  const t = useTranslations('gantt.drawer');
  const [trackedDesc, setTrackedDesc] = useState(item.data.description);
  const [draft, setDraft] = useState(item.data.description || '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (trackedDesc !== item.data.description) {
    setTrackedDesc(item.data.description);
    setDraft(item.data.description || '');
  }

  const handleChange = (value: string) => {
    setDraft(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      patchItem({ description: value });
    }, 800);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('description')}
        </label>
        <span className="text-2xs text-muted-foreground/60">{draft.length}/5000</span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('noDescription')}
        maxLength={5000}
        rows={5}
        className="w-full text-sm bg-muted/40 border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none leading-relaxed transition-all"
      />
    </div>
  );
}

function DrawerActivity({
  item,
  users,
  onComment,
}: {
  item: ItemRef;
  users: IUserConfig[];
  onComment: (text: string, mentionedUserIds?: string[]) => void;
}) {
  const t = useTranslations('gantt.drawer');
  const format = useFormatter();
  const [commentDraft, setCommentDraft] = useState('');
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = item.data.comments || [];
  const userMap = Object.fromEntries(users.map((u) => [u.uid, u]));
  const userByName = Object.fromEntries(users.map((u) => [u.name, u]));

  const submitComment = () => {
    if (commentDraft.trim()) {
      onComment(commentDraft, pendingMentions.length > 0 ? pendingMentions : undefined);
      setCommentDraft('');
      setPendingMentions([]);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitComment();
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-5 py-5 space-y-5">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No comments yet</p>
            </div>
          ) : (
            [...comments].reverse().map((comment) => {
              const author = userMap[comment.authorId] || userByName[comment.authorId];
              const authorName = author?.name || t('unknownUser');
              const relativeTime = format.relativeTime(new Date(comment.createdAt), new Date());
              return (
                <div key={comment._id} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <OwnerAvatar name={authorName} color={author?.color} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0 bg-muted/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold leading-none">{authorName}</span>
                      <span className="text-xs text-muted-foreground leading-none">{relativeTime}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Comment input */}
      <div className="flex-shrink-0 border-t px-5 py-4">
        <div className="rounded-2xl border bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <MentionTextarea
            value={commentDraft}
            onChange={setCommentDraft}
            onMentionsChange={setPendingMentions}
            onKeyDown={handleKeyDown}
            users={users}
            placeholder={t('addComment')}
            maxLength={5000}
            rows={3}
            className="text-sm px-4 pt-3 pb-1 leading-relaxed"
            textareaRef={textareaRef}
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{t('cmdEnterToSend')}</span>
              <span className="text-2xs text-muted-foreground/60">{commentDraft.length}/5000</span>
            </div>
            <Button
              size="sm"
              disabled={!commentDraft.trim()}
              onClick={submitComment}
              className="h-7 px-3 gap-1.5"
            >
              <SendIcon className="w-3.5 h-3.5" />
              {t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

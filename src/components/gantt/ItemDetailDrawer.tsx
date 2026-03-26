'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSession } from 'next-auth/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { IEpic, IFeature, ITask } from '@/types';
import { SendIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { snapToWorkday } from '@/lib/dateUtils';

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
  const format = useFormatter();
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
  }, [session?.user?.name, users]);

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

  const patchItem = (patch: Partial<IEpic & IFeature & ITask>) => {
    if (!item) return;
    if (item.level === 'epic') updateEpic(item.epicId, patch);
    else if (item.level === 'feature') updateFeature(item.epicId, item.featureId!, patch);
    else updateTask(item.epicId, item.featureId!, item.taskId!, patch);
  };

  return (
    <Sheet open={!!openItemRef} onOpenChange={(open) => { if (!open) closeItem(); }}>
      <SheetContent showCloseButton={true} className="overflow-hidden flex flex-col gap-0 p-0">
        <VisuallyHidden asChild>
          <SheetTitle>{item?.data.name} Details</SheetTitle>
        </VisuallyHidden>
        {item && (
          <>
            {/* Header */}
            <div className="border-b px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={item.data.status} className="text-[9px]" />
                  <span className="text-xs font-mono text-muted-foreground">{itemLabel}</span>
                </div>
                <input
                  type="text"
                  value={item.data.name}
                  onChange={(e) => patchItem({ name: e.target.value })}
                  className="w-full text-lg font-semibold bg-transparent border-0 focus:outline-none p-0 focus:ring-0"
                />
              </div>
              <SheetClose className="opacity-70 hover:opacity-100" />
            </div>

            {/* Metadata Grid */}
            <div className="border-b px-6 py-4 space-y-4">
              {/* Assignee Button Grid */}
              {users.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('assignee')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => patchItem({ ownerId: undefined })}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded border text-[12px] transition-colors',
                        !item.data.ownerId
                          ? 'border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-500/10'
                          : 'border-border text-muted-foreground hover:border-border/80'
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
                          'flex items-center gap-1.5 px-2 py-1 rounded border text-[12px] transition-colors',
                          item.data.ownerId === u.uid
                            ? 'border-blue-400 text-blue-600 dark:text-blue-300 bg-blue-500/10'
                            : 'border-border text-muted-foreground hover:border-border/80'
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('startDate')}
                  </label>
                  <Input
                    type="date"
                    value={item.data.plannedStart.split('T')[0]}
                    onChange={(e) => {
                      const allowWeekends = useSettingsStore.getState().allowWeekends;
                      if (!allowWeekends && e.target.value) {
                        const snapped = snapToWorkday(parseISO(e.target.value), 'forward');
                        patchItem({ plannedStart: snapped.toISOString() });
                      } else {
                        patchItem({ plannedStart: new Date(e.target.value).toISOString() });
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t('dueDate')}
                  </label>
                  <Input
                    type="date"
                    value={item.data.plannedEnd.split('T')[0]}
                    onChange={(e) => {
                      const allowWeekends = useSettingsStore.getState().allowWeekends;
                      if (!allowWeekends && e.target.value) {
                        const snapped = snapToWorkday(parseISO(e.target.value), 'backward');
                        patchItem({ plannedEnd: snapped.toISOString() });
                      } else {
                        patchItem({ plannedEnd: new Date(e.target.value).toISOString() });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Status & Progress */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('status')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => patchItem({ status: s.value })}
                      className={cn(
                        'px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wider text-white transition-all',
                        item.data.status === s.value
                          ? 'ring-2 ring-offset-1 ring-offset-background'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{ backgroundColor: s.color }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('progress')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={item.data.completionPct}
                    onChange={(e) => patchItem({ completionPct: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <DrawerDescription item={item} patchItem={patchItem} />

            {/* Activity Feed */}
            <DrawerActivity
              item={item}
              users={users}
              onComment={(text) => {
                addComment(item.epicId, item.featureId, item.taskId, text, currentUserUid);
              }}
            />
          </>
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
  patchItem: (patch: any) => void;
}) {
  const t = useTranslations('gantt.drawer');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.data.description || '');

  useEffect(() => {
    setDraft(item.data.description || '');
  }, [item.data.description]);

  const onSave = () => {
    patchItem({ description: draft });
    setEditing(false);
  };

  return (
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('description')}
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline"
          >
            {draft ? t('editDescription') : 'Add'}
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter description..."
            className="w-full text-sm bg-transparent border rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none h-32"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setDraft(item.data.description || '');
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <Button size="sm" onClick={onSave}>
              {t('doneEditing')}
            </Button>
          </div>
        </div>
      ) : draft ? (
        <p className="text-sm whitespace-pre-wrap text-foreground">{draft}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t('noDescription')}</p>
      )}
    </div>
  );
}

function DrawerActivity({
  item,
  users,
  onComment,
}: {
  item: ItemRef;
  users: any[];
  onComment: (text: string) => void;
}) {
  const t = useTranslations('gantt.drawer');
  const format = useFormatter();
  const [commentDraft, setCommentDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = item.data.comments || [];
  const userMap = Object.fromEntries(users.map((u) => [u.uid, u]));

  const handleSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (commentDraft.trim()) {
        onComment(commentDraft);
        setCommentDraft('');
        if (textareaRef.current) textareaRef.current.focus();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-t">
      <div className="flex-shrink-0 px-6 py-4 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('activityFeed')}
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No comments yet. Start a discussion!
            </p>
          ) : (
            comments.map((comment) => {
              const author = userMap[comment.authorId];
              const relativeTime = format.relativeTime(new Date(comment.createdAt), new Date());
              return (
                <div key={comment._id} className="flex gap-3">
                  <OwnerAvatar
                    name={author?.name || 'Unknown'}
                    color={author?.color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">
                        {author?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {relativeTime}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-foreground whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <button className="hover:text-foreground">{t('like')}</button>
                      <button className="hover:text-foreground">{t('reply')}</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Comment input */}
      <div className="flex-shrink-0 border-t px-6 py-4 space-y-2">
        <textarea
          ref={textareaRef}
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onKeyDown={handleSubmit}
          placeholder={t('addComment')}
          className="w-full text-sm bg-transparent border rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none h-16"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('cmdEnterToSend')}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (commentDraft.trim()) {
                onComment(commentDraft);
                setCommentDraft('');
              }
            }}
          >
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

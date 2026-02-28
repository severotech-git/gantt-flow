'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { snapToWorkday } from '@/lib/dateUtils';

type AddMode = 'epic' | 'feature' | 'task';

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  mode: AddMode;
  epicId?: string;
  featureId?: string;
}

const today = new Date();

export function AddItemDialog({ open, onClose, mode, epicId, featureId }: AddItemDialogProps) {
  const { levelNames, statuses, users, allowWeekends } = useSettingsStore();
  const [name, setName] = useState('');
  const [plannedStart, setPlannedStart] = useState(format(today, 'yyyy-MM-dd'));
  const [plannedEnd, setPlannedEnd] = useState(format(addDays(today, 7), 'yyyy-MM-dd'));

  function handleStartChange(val: string) {
    if (!allowWeekends && val) {
      const snapped = snapToWorkday(parseISO(val), 'forward');
      setPlannedStart(format(snapped, 'yyyy-MM-dd'));
    } else {
      setPlannedStart(val);
    }
  }

  function handleEndChange(val: string) {
    if (!allowWeekends && val) {
      const snapped = snapToWorkday(parseISO(val), 'backward');
      setPlannedEnd(format(snapped, 'yyyy-MM-dd'));
    } else {
      setPlannedEnd(val);
    }
  }
  const [status, setStatus] = useState(statuses[0]?.value ?? 'todo');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { addEpic, addFeature, addTask, activeProject } = useProjectStore();

  const levelLabel = mode === 'epic' ? levelNames.epic : mode === 'feature' ? levelNames.feature : levelNames.task;
  const title = `Add ${levelLabel}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !activeProject) return;
    setLoading(true);

    const base = {
      name: name.trim(),
      status,
      completionPct: 0,
      plannedStart: new Date(plannedStart).toISOString(),
      plannedEnd: new Date(plannedEnd).toISOString(),
      ownerId: selectedUserId ?? undefined,
    };

    if (mode === 'epic') {
      await addEpic({ ...base, features: [] });
      const { activeProject: p, expandedEpicIds, toggleEpic } = useProjectStore.getState();
      const newEpic = p?.epics[p.epics.length - 1];
      if (newEpic && !expandedEpicIds.has(newEpic._id)) toggleEpic(newEpic._id);
    } else if (mode === 'feature' && epicId) {
      await addFeature(epicId, { ...base, tasks: [] });
      const { activeProject: p, expandedFeatureIds, toggleFeature } = useProjectStore.getState();
      const epic = p?.epics.find((e) => e._id === epicId);
      const newFeat = epic?.features[epic.features.length - 1];
      if (newFeat && !expandedFeatureIds.has(newFeat._id)) toggleFeature(newFeat._id);
    } else if (mode === 'task' && epicId && featureId) {
      await addTask(epicId, featureId, base);
    }

    setLoading(false);
    setName('');
    setSelectedUserId(null);
    setStatus(statuses[0]?.value ?? 'todo');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${levelLabel} name…`}
              className="focus-visible:ring-violet-500"
            />
          </div>
          {(mode === 'feature' || mode === 'task') && users.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Owner</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded border text-[12px] transition-colors',
                    selectedUserId === null
                      ? 'border-violet-400 text-violet-600 dark:text-violet-300 bg-violet-500/10'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  )}
                >
                  unassigned
                </button>
                {users.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => setSelectedUserId(u.uid)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded border text-[12px] transition-colors',
                      selectedUserId === u.uid
                        ? 'border-violet-400 text-violet-600 dark:text-violet-300 bg-violet-500/10'
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Planned Start</label>
              <Input
                type="date"
                value={plannedStart}
                onChange={(e) => handleStartChange(e.target.value)}
                className="focus-visible:ring-violet-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Planned End</label>
              <Input
                type="date"
                value={plannedEnd}
                onChange={(e) => handleEndChange(e.target.value)}
                className="focus-visible:ring-violet-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider border transition-colors ${
                    status === s.value
                      ? 'border-violet-400 text-violet-600 dark:text-violet-300 bg-violet-500/10'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {loading ? 'Adding…' : `Add ${levelLabel}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

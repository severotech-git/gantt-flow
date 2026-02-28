'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusType } from '@/types';
import { format, addDays } from 'date-fns';

type AddMode = 'epic' | 'feature' | 'task';

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
  mode: AddMode;
  epicId?: string;
  featureId?: string;
}

const STATUS_OPTIONS: StatusType[] = ['todo', 'in-progress', 'qa', 'done', 'canceled', 'blocked'];

const today = new Date();

export function AddItemDialog({ open, onClose, mode, epicId, featureId }: AddItemDialogProps) {
  const [name, setName] = useState('');
  const [plannedStart, setPlannedStart] = useState(format(today, 'yyyy-MM-dd'));
  const [plannedEnd, setPlannedEnd] = useState(format(addDays(today, 7), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<StatusType>('todo');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);

  const { addEpic, addFeature, addTask, activeProject } = useProjectStore();

  const titles: Record<AddMode, string> = {
    epic: 'Add Epic',
    feature: 'Add Feature',
    task: 'Add Task',
  };

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
      ownerName: ownerName.trim() || undefined,
    };

    if (mode === 'epic') {
      await addEpic({ ...base, features: [] });
      // Expand the newly created epic so the user can immediately add features
      const { activeProject: p, expandedEpicIds, toggleEpic } = useProjectStore.getState();
      const newEpic = p?.epics[p.epics.length - 1];
      if (newEpic && !expandedEpicIds.has(newEpic._id)) toggleEpic(newEpic._id);
    } else if (mode === 'feature' && epicId) {
      await addFeature(epicId, { ...base, tasks: [] });
      // Expand the newly created feature so the user can immediately add tasks
      const { activeProject: p, expandedFeatureIds, toggleFeature } = useProjectStore.getState();
      const epic = p?.epics.find((e) => e._id === epicId);
      const newFeat = epic?.features[epic.features.length - 1];
      if (newFeat && !expandedFeatureIds.has(newFeat._id)) toggleFeature(newFeat._id);
    } else if (mode === 'task' && epicId && featureId) {
      await addTask(epicId, featureId, base);
    }

    setLoading(false);
    setName('');
    setOwnerName('');
    setStatus('todo');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#161b22] border-white/[0.1] text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{titles[mode]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${titles[mode]} name…`}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
            />
          </div>
          {(mode === 'feature' || mode === 'task') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Owner name</label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Planned Start</label>
              <Input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white focus-visible:ring-violet-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Planned End</label>
              <Input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white focus-visible:ring-violet-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider border transition-colors ${
                    status === s
                      ? 'border-violet-400 text-violet-300 bg-violet-900/30'
                      : 'border-white/[0.1] text-slate-500 hover:border-white/[0.2]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {loading ? 'Adding…' : `Add ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

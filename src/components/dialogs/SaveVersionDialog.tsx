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

interface SaveVersionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaveVersionDialog({ open, onClose }: SaveVersionDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveVersion } = useProjectStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await saveVersion(name.trim());
    setLoading(false);
    setName('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#161b22] border-white/[0.1] text-slate-100 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Save Snapshot</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400 -mt-1">
          Creates a read-only copy of the current project state. You can restore it later.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Version name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. v2.4, Sprint 12, Q3 Final"
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {loading ? 'Saving…' : 'Save Snapshot'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

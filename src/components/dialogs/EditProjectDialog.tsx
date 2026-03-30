'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { IProject } from '@/types';
import { useTranslations } from 'next-intl';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

interface EditProjectDialogProps {
  open: boolean;
  onClose: () => void;
  project?: Omit<IProject, 'epics'> | null;
}

export function EditProjectDialog({ open, onClose, project: propProject }: EditProjectDialogProps) {
  const t = useTranslations('dialogs.editProject');
  const { activeProject } = useProjectStore();

  // Use prop project if provided, otherwise fallback to activeProject from store
  const project = propProject || activeProject;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project && open) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color || COLORS[0]);
    }
  }, [project, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !project) return;

    setLoading(true);

    try {
      // We perform a direct PATCH here because updateProject in the store
      // is designed for the active project. For the list view, we want
      // a more generic update that works for any project ID.
      const res = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          color,
        }),
      });

      if (res.ok) {
        // Refresh the projects list in the store
        useProjectStore.getState().fetchProjects();
        // If we are editing the currently active project, update it too
        if (activeProject?._id === project._id) {
          useProjectStore.setState((s) => {
            if (s.activeProject) {
              s.activeProject.name = name.trim();
              s.activeProject.description = description.trim();
              s.activeProject.color = color;
            }
          });
        }
        onClose();
      }
    } catch (err) {
      console.error('Failed to update project:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t('nameLabel')}</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={255}
              className="focus-visible:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t('descriptionLabel')}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              maxLength={5000}
              className="focus-visible:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t('colorLabel')}</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all ring-offset-background",
                    color === c ? "ring-2 ring-blue-500 ring-offset-2" : "hover:scale-110"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
            >
              {loading ? t('saving') : t('saveButton')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { useTranslations } from 'next-intl';

interface SaveVersionDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SaveVersionDialog({ open, onClose }: SaveVersionDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveVersion } = useProjectStore();
  const t = useTranslations('dialogs.saveVersion');
  const tCommon = useTranslations('common');

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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          {t('subtitle')}
        </p>
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? t('saving') : t('saveButton')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

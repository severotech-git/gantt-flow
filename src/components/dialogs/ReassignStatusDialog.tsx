'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { IStatusConfig } from '@/types';
import { useTranslations } from 'next-intl';

interface ReassignStatusDialogProps {
  open: boolean;
  onClose: () => void;
  statusToDelete: IStatusConfig;
  usageCount: number;
  availableStatuses: IStatusConfig[];
  onConfirm: (toStatus: string) => void;
}

export function ReassignStatusDialog({
  open,
  onClose,
  statusToDelete,
  usageCount,
  availableStatuses,
  onConfirm,
}: ReassignStatusDialogProps) {
  const [targetStatus, setTargetStatus] = useState(availableStatuses[0]?.value ?? '');
  const [loading, setLoading] = useState(false);
  const t = useTranslations('dialogs.reassignStatus');
  const tCommon = useTranslations('common');

  async function handleConfirm() {
    if (!targetStatus) return;
    setLoading(true);
    await onConfirm(targetStatus);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('description', { label: statusToDelete.label, count: usageCount })}
        </p>
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs text-muted-foreground">{t('targetLabel')}</label>
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !targetStatus}
            className="bg-red-600 hover:bg-red-500 text-white"
          >
            {loading ? t('reassigning') : t('confirmButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

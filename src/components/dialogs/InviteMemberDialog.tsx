'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccountStore } from '@/store/useAccountStore';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const t = useTranslations('dialogs.inviteMember');
  const tErr = useTranslations('apiErrors');
  const sendInvitation = useAccountStore((s) => s.sendInvitation);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendInvitation(email.trim(), role);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setEmail('');
        setRole('member');
        onOpenChange(false);
      }, 1500);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code) {
        setError(tErr(e.code as never));
      } else {
        setError(e.message || t('failedError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('emailLabel')}</label>
            <Input
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('roleLabel')}</label>
            <Select value={role} onValueChange={setRole} disabled={loading || success}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{t('roleMember')}</SelectItem>
                <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600">{t('successMessage')}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || success} className="bg-blue-600 hover:bg-blue-500 text-white">
              {loading ? <><Loader2 size={14} className="mr-1.5 animate-spin" />{t('sending')}</> : t('sendButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

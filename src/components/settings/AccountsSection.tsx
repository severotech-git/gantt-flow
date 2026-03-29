'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import { useProjectStore } from '@/store/useProjectStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Star, LogIn, Loader2, Building2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AccountsSection() {
  const t = useTranslations('settings.accounts');
  const { data: session, update } = useSession();
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const mainAccountId = useAccountStore((s) => s.mainAccountId);
  const setMainAccount = useAccountStore((s) => s.setMainAccount);
  const switchAccount = useAccountStore((s) => s.switchAccount);
  const renameAccount = useAccountStore((s) => s.renameAccount);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);

  const [settingMain, setSettingMain] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const activeAccountId = session?.user?.activeAccountId;

  const handleSetMain = async (accountId: string) => {
    if (accountId === mainAccountId) return;
    setSettingMain(accountId);
    try {
      await setMainAccount(accountId);
    } catch (err) {
      console.error(err);
    } finally {
      setSettingMain(null);
    }
  };

  const handleSwitch = async (accountId: string) => {
    if (accountId === activeAccountId) return;
    setSwitching(accountId);
    try {
      await switchAccount(accountId);
      await update({ activeAccountId: accountId });
      await fetchProjects();
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(null);
    }
  };

  const openEdit = (id: string, name: string) => {
    setEditTarget({ id, name });
    setEditName(name);
    setEditError('');
  };

  const handleRename = async () => {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (trimmed.length < 2) { setEditError(t('nameTooShort')); return; }
    if (trimmed === editTarget.name) { setEditTarget(null); return; }
    setIsSaving(true);
    setEditError('');
    try {
      await renameAccount(editTarget.id, trimmed);
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">
          {accounts.length === 1 ? t('memberOfSingular', { count: accounts.length }) : t('memberOfPlural', { count: accounts.length })}{' '}
          {t('defaultAutoOpen', { defaultLabel: t('defaultLabel') })}
        </p>
      </div>

      {/* Explainer card */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
        <Star size={16} className="shrink-0 mt-0.5 fill-yellow-400 text-yellow-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t('explainerTitle')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('explainerBody')}</p>
        </div>
      </div>

      {/* Account cards */}
      <div className="space-y-3">
        {accounts.map((acc) => {
          const isMain = acc._id === mainAccountId;
          const isActive = acc._id === activeAccountId;
          const isSettingMain = settingMain === acc._id;
          const isSwitching = switching === acc._id;
          const canEdit = acc.role === 'owner' || acc.role === 'admin';

          return (
            <div
              key={acc._id}
              className={cn(
                'rounded-xl border-2 p-4 transition-all',
                isActive
                  ? 'border-blue-500/40 bg-blue-500/5'
                  : 'border-border bg-muted/20 hover:border-border/80'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Workspace icon */}
                <div className={cn(
                  'shrink-0 flex items-center justify-center w-9 h-9 rounded-lg',
                  isActive ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'
                )}>
                  <Building2 size={17} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{acc.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{acc.role}</Badge>
                    {isMain && (
                      <span className="inline-flex items-center gap-1 bg-yellow-500 text-yellow-950 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0">
                        <Star size={9} className="fill-yellow-950" />
                        {t('defaultBadge')}
                      </span>
                    )}
                    {isActive && (
                      <Badge className="text-[10px] shrink-0 bg-blue-500/15 text-blue-400 border-blue-500/20">
                        {t('activeBadge')}
                      </Badge>
                    )}
                  </div>
                  {isMain && (
                    <p className="text-xs text-muted-foreground mt-0.5">{t('opensAutomatically')}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => openEdit(acc._id, acc.name)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title={t('renameTitle')}
                    >
                      <Pencil size={13} />
                      {t('renameButton')}
                    </button>
                  )}

                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(acc._id)}
                      disabled={isSwitching}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title={t('switchTitle')}
                    >
                      {isSwitching
                        ? <Loader2 size={13} className="animate-spin" />
                        : <LogIn size={13} />
                      }
                      {t('switchButton')}
                    </button>
                  )}

                  {!isMain && (
                    <button
                      onClick={() => handleSetMain(acc._id)}
                      disabled={isSettingMain}
                      title={t('setDefaultTitle')}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-yellow-500 transition-colors disabled:opacity-50"
                    >
                      {isSettingMain
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Star size={13} />
                      }
                      {t('setDefaultButton')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{t('joinNote')}</p>

      {/* Rename dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('renameDialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 py-2">
            <Input
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
              placeholder={t('workspaceNamePlaceholder')}
              maxLength={255}
              autoFocus
              className="focus-visible:ring-blue-500"
            />
            {editError && <p className="text-xs text-red-500">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={isSaving}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleRename}
              disabled={isSaving || editName.trim().length < 2}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

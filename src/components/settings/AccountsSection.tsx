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

export function AccountsSection() {
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
    if (trimmed.length < 2) { setEditError('Name must be at least 2 characters.'); return; }
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
        <h2 className="text-lg font-semibold text-foreground mb-1">Workspaces</h2>
        <p className="text-sm text-muted-foreground">
          You are a member of {accounts.length} workspace{accounts.length !== 1 ? 's' : ''}.
          Your <span className="text-foreground font-medium">default workspace</span> opens automatically every time you log in.
        </p>
      </div>

      {/* Explainer card */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
        <Star size={16} className="shrink-0 mt-0.5 fill-yellow-400 text-yellow-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">What is the default workspace?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you sign in, GanttFlow opens your default workspace automatically — no extra clicks.
            You can still switch to any workspace you belong to at any time from the sidebar.
          </p>
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
                  ? 'border-violet-500/40 bg-violet-500/5'
                  : 'border-border bg-muted/20 hover:border-border/80'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Workspace icon */}
                <div className={cn(
                  'shrink-0 flex items-center justify-center w-9 h-9 rounded-lg',
                  isActive ? 'bg-violet-500/20 text-violet-500' : 'bg-muted text-muted-foreground'
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
                        Default
                      </span>
                    )}
                    {isActive && (
                      <Badge className="text-[10px] shrink-0 bg-violet-500/15 text-violet-400 border-violet-500/20">
                        Active now
                      </Badge>
                    )}
                  </div>
                  {isMain && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Opens automatically when you log in
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => openEdit(acc._id, acc.name)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      title="Rename workspace"
                    >
                      <Pencil size={13} />
                      Rename
                    </button>
                  )}

                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(acc._id)}
                      disabled={isSwitching}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="Switch to this workspace"
                    >
                      {isSwitching
                        ? <Loader2 size={13} className="animate-spin" />
                        : <LogIn size={13} />
                      }
                      Switch
                    </button>
                  )}

                  {!isMain && (
                    <button
                      onClick={() => handleSetMain(acc._id)}
                      disabled={isSettingMain}
                      title="Set as default workspace"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-yellow-500 transition-colors disabled:opacity-50"
                    >
                      {isSettingMain
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Star size={13} />
                      }
                      Set default
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        To join a new workspace, ask a workspace owner or admin to send you an invitation.
      </p>

      {/* Rename dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 py-2">
            <Input
              value={editName}
              onChange={(e) => { setEditName(e.target.value); setEditError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
              placeholder="Workspace name"
              autoFocus
              className="focus-visible:ring-violet-500"
            />
            {editError && <p className="text-xs text-red-500">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isSaving || editName.trim().length < 2}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

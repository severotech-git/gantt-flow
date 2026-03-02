'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useCanManage } from '@/hooks/useAccountRole';
import { IUserConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { ColorSwatch } from './ColorSwatch';
import { Trash2, Plus, Lock } from 'lucide-react';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function UsersSection() {
  const router = useRouter();
  const { data: session } = useSession();
  const accounts = useAccountStore((s) => s.accounts);
  const { users, addUser, updateUser, deleteUser, persistSettings, isSaving } = useSettingsStore();

  const canManage = useCanManage();
  const activeAccountId = session?.user?.activeAccountId;
  const activeAccount = accounts.find((a) => a._id === activeAccountId);
  const accountMemberIds = new Set(activeAccount?.members.map((m) => m.userId) ?? []);

  const realMembers = users.filter((u) => accountMemberIds.has(u.uid));
  const guestAssignees = users.filter((u) => !accountMemberIds.has(u.uid));

  function handleAdd() {
    addUser({ uid: generateId(), name: '', color: '#6366f1' });
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Assignees</h2>
        <p className="text-sm text-muted-foreground">
          Everyone listed here can be set as the owner of epics, features, and tasks.
        </p>
      </div>

      {/* ── Account Members ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Account Members</h3>
          <Badge variant="outline" className="text-[10px]">synced</Badge>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          These are people with actual accounts. Manage access in{' '}
          <button
            className="text-primary hover:underline"
            onClick={() => router.push('/settings?section=team')}
          >
            Team &amp; Access
          </button>
          .
        </p>

        <div className="space-y-2">
          {realMembers.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic py-2">No account members yet.</p>
          )}
          {realMembers.map((user) => {
            const isYou = session?.user?.id === user.uid;
            const memberRole = activeAccount?.members.find((m) => m.userId === user.uid)?.role;
            return (
              <AccountMemberRow
                key={user.uid}
                user={user}
                isYou={isYou}
                canEdit={canManage && !isYou}
                role={memberRole}
                onNameChange={(name) => updateUser(user.uid, { name })}
                onColorChange={(color) => updateUser(user.uid, { color })}
              />
            );
          })}
        </div>
      </section>

      <div className="border-t border-border" />

      {/* ── Guest Assignees ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Guest Assignees</h3>
          <Badge variant="outline" className="text-[10px]">virtual</Badge>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          People who can be assigned to tasks but don&apos;t have an account. Useful for contractors or external collaborators.
        </p>

        <div className="space-y-2">
          {guestAssignees.length === 0 && (
            <p className="text-xs text-muted-foreground/60 italic py-2">No guest assignees yet.</p>
          )}
          {guestAssignees.map((user) => (
            <GuestRow
              key={user.uid}
              user={user}
              onUpdate={(patch) => updateUser(user.uid, patch)}
              onDelete={() => deleteUser(user.uid)}
            />
          ))}
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-violet-500 transition-colors group"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-border group-hover:border-violet-500 transition-colors">
            <Plus size={11} />
          </span>
          Add Guest Assignee
        </button>
      </section>

      <Button
        onClick={() => persistSettings('users')}
        disabled={isSaving}
        className="bg-violet-600 hover:bg-violet-500 text-white"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

// ── Account member row (name locked, color editable) ─────────────────────────

function AccountMemberRow({
  user,
  isYou,
  canEdit,
  role,
  onNameChange,
  onColorChange,
}: {
  user: IUserConfig;
  isYou: boolean;
  canEdit: boolean;
  role?: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border group">
      <OwnerAvatar name={user.name || '?'} color={user.color} size={28} />

      <div className="flex-1 flex items-center gap-2 min-w-0">
        {canEdit ? (
          <Input
            value={user.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Name…"
            className="h-7 text-sm focus-visible:ring-violet-500"
          />
        ) : (
          <span className="text-sm truncate">{user.name || <span className="text-muted-foreground italic">Unnamed</span>}</span>
        )}
        {role && !canEdit && (
          <Badge variant="outline" className="text-[10px] shrink-0">{role}</Badge>
        )}
        {isYou && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 shrink-0">
            You
          </span>
        )}
      </div>

      <ColorSwatch color={user.color} onChange={onColorChange} size={24} />

      {canEdit ? (
        role && <Badge variant="outline" className="text-[10px] shrink-0">{role}</Badge>
      ) : (
        <Lock size={13} className="text-muted-foreground/40 shrink-0" />
      )}
    </div>
  );
}

// ── Guest assignee row (fully editable) ──────────────────────────────────────

function GuestRow({
  user,
  onUpdate,
  onDelete,
}: {
  user: IUserConfig;
  onUpdate: (patch: Partial<IUserConfig>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border group">
      <OwnerAvatar name={user.name || '?'} color={user.color} size={28} />

      <div className="flex-1">
        <Input
          value={user.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name…"
          className="h-7 text-sm focus-visible:ring-violet-500"
        />
      </div>

      <ColorSwatch color={user.color} onChange={(c) => onUpdate({ color: c })} size={24} />

      <button
        onClick={onDelete}
        className="text-muted-foreground/60 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

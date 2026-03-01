'use client';

import { useSession } from 'next-auth/react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { IUserConfig } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { ColorSwatch } from './ColorSwatch';
import { Trash2, Plus } from 'lucide-react';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function UsersSection() {
  const { users, addUser, updateUser, deleteUser, persistSettings, isSaving } = useSettingsStore();
  const { data: session } = useSession();

  function handleAdd() {
    addUser({ uid: generateId(), name: '', color: '#6366f1' });
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Team Members</h2>
        <p className="text-sm text-muted-foreground">
          Define the people who can be assigned as Owner on tasks, features, and epics.
        </p>
      </div>

      <div className="space-y-2">
        {users.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic py-2">No users yet. Add one below.</p>
        )}
        {users.map((user) => (
          <UserRow
            key={user.uid}
            user={user}
            isCurrentUser={session?.user?.id === user.uid}
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
        Add Member
      </button>

      <Button
        onClick={persistSettings}
        disabled={isSaving}
        className="bg-violet-600 hover:bg-violet-500 text-white"
      >
        {isSaving ? 'Saving…' : 'Save Members'}
      </Button>
    </div>
  );
}

interface UserRowProps {
  user: IUserConfig;
  isCurrentUser?: boolean;
  onUpdate: (patch: Partial<IUserConfig>) => void;
  onDelete: () => void;
}

function UserRow({ user, isCurrentUser = false, onUpdate, onDelete }: UserRowProps) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border ${!isCurrentUser ? 'group' : ''}`}>
      <OwnerAvatar name={user.name || '?'} color={user.color} size={28} />

      <div className="flex-1 flex items-center">
        <Input
          value={user.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Name…"
          disabled={isCurrentUser}
          className="h-7 text-sm focus-visible:ring-violet-500"
        />
      </div>

      <ColorSwatch color={user.color} onChange={(c) => !isCurrentUser && onUpdate({ color: c })} size={24} />

      {isCurrentUser && (
        <span className="text-[11px] font-medium px-2 py-1 rounded bg-violet-500/20 text-violet-400 whitespace-nowrap">
          You
        </span>
      )}

      {!isCurrentUser && (
        <button
          onClick={onDelete}
          className="text-muted-foreground/60 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

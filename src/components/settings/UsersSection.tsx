'use client';

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

  function handleAdd() {
    addUser({ uid: generateId(), name: '', color: '#6366f1' });
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Team Members</h2>
        <p className="text-sm text-slate-400">
          Define the people who can be assigned as Owner on tasks, features, and epics.
        </p>
      </div>

      <div className="space-y-2">
        {users.length === 0 && (
          <p className="text-xs text-slate-600 italic py-2">No users yet. Add one below.</p>
        )}
        {users.map((user) => (
          <UserRow
            key={user.uid}
            user={user}
            onUpdate={(patch) => updateUser(user.uid, patch)}
            onDelete={() => deleteUser(user.uid)}
          />
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-300 transition-colors group"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded border border-dashed border-slate-600 group-hover:border-violet-500 transition-colors">
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
  onUpdate: (patch: Partial<IUserConfig>) => void;
  onDelete: () => void;
}

function UserRow({ user, onUpdate, onDelete }: UserRowProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] group">
      <OwnerAvatar name={user.name || '?'} color={user.color} size={28} />

      <Input
        value={user.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder="Name…"
        className="flex-1 h-7 text-sm bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
      />

      <ColorSwatch color={user.color} onChange={(c) => onUpdate({ color: c })} size={24} />

      <button
        onClick={onDelete}
        className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        title="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

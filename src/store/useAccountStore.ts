import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { IAccount, IAccountMember, IInvitation } from '@/types';

interface EnrichedMember extends IAccountMember {
  user?: { name: string; email: string; image?: string } | null;
}

interface AccountState {
  accounts: (IAccount & { role: string })[];
  mainAccountId: string | null;
  currentAccount: IAccount | null;
  members: EnrichedMember[];
  invitations: IInvitation[];
  pendingInvites: IInvitation[];
  isLoading: boolean;
}

interface AccountActions {
  fetchAccounts: () => Promise<void>;
  fetchMembers: (accountId: string) => Promise<void>;
  fetchInvitations: () => Promise<void>;
  fetchPendingInvitations: () => Promise<void>;
  sendInvitation: (email: string, role: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<string>; // returns accountId
  rejectInvitation: (token: string) => Promise<void>;
  renameAccount: (accountId: string, name: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  setMainAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  cancelInvitation: (token: string) => Promise<void>;
  removeMember: (accountId: string, userId: string) => Promise<void>;
  updateMemberRole: (accountId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  createAccount: (name: string) => Promise<void>;
}

// Suppress unused-get warning; kept for future actions that need current state
export const useAccountStore = create<AccountState & AccountActions>()(
  immer((set) => ({
    accounts: [],
    mainAccountId: null,
    currentAccount: null,
    members: [],
    invitations: [],
    pendingInvites: [],
    isLoading: false,

    fetchAccounts: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const res = await fetch('/api/accounts');
        if (!res.ok) return;
        const data = await res.json();
        set((s) => {
          s.accounts = data.accounts;
          s.mainAccountId = data.mainAccountId ?? null;
        });
      } finally {
        set((s) => { s.isLoading = false; });
      }
    },

    fetchMembers: async (accountId) => {
      const res = await fetch(`/api/accounts/${accountId}/members`);
      if (!res.ok) return;
      const data = await res.json();
      set((s) => { s.members = data; });
    },

    fetchInvitations: async () => {
      const res = await fetch('/api/invitations');
      if (!res.ok) return;
      const data = await res.json();
      set((s) => { s.invitations = data; });
    },

    fetchPendingInvitations: async () => {
      const res = await fetch('/api/invitations/pending');
      if (!res.ok) return;
      const data = await res.json();
      set((s) => { s.pendingInvites = data; });
    },

    sendInvitation: async (email, role) => {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to send invitation');
      }
      const inv = await res.json();
      set((s) => {
        s.invitations = s.invitations.filter((i) => i.email !== inv.email);
        s.invitations.push(inv);
      });
    },

    acceptInvitation: async (token) => {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to accept invitation');
      }
      const data = await res.json();
      // Remove from pendingInvites
      set((s) => { s.pendingInvites = s.pendingInvites.filter((i) => i.token !== token); });
      return data.accountId as string;
    },

    rejectInvitation: async (token) => {
      const res = await fetch(`/api/invitations/${token}/reject`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to reject invitation');
      }
      set((s) => { s.pendingInvites = s.pendingInvites.filter((i) => i.token !== token); });
    },

    renameAccount: async (accountId, name) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to rename account');
      }
      set((s) => {
        const acc = s.accounts.find((a) => a._id === accountId);
        if (acc) acc.name = name.trim();
      });
    },

    switchAccount: async (accountId) => {
      // Validate membership on the server
      const res = await fetch('/api/accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to switch account');
      }
      // Session update (activeAccountId in JWT) is handled by the caller
      // via useSession().update({ activeAccountId }) — then a page reload.
    },

    setMainAccount: async (accountId) => {
      set((s) => { s.mainAccountId = accountId; }); // optimistic
      const res = await fetch('/api/accounts/main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to set main account');
      }
    },

    removeAccount: async (accountId) => {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to delete account');
      }
      set((s) => { s.accounts = s.accounts.filter((a) => a._id !== accountId); });
    },

    removeMember: async (accountId, userId) => {
      const res = await fetch(`/api/accounts/${accountId}/members/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to remove member');
      }
      set((s) => {
        s.members = s.members.filter((m) => m.userId !== userId);
        const acc = s.accounts.find((a) => a._id === accountId);
        if (acc) acc.members = acc.members.filter((m) => m.userId !== userId);
      });
    },

    cancelInvitation: async (token) => {
      const res = await fetch(`/api/invitations/${token}`, { method: 'PATCH' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to cancel invitation');
      }
      set((s) => { s.invitations = s.invitations.filter((i) => i.token !== token); });
    },

    updateMemberRole: async (accountId, userId, role) => {
      const res = await fetch(`/api/accounts/${accountId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to update role');
      }
      set((s) => {
        const m = s.members.find((m) => m.userId === userId);
        if (m) m.role = role;
        const acc = s.accounts.find((a) => a._id === accountId);
        if (acc) {
          const am = acc.members.find((m) => m.userId === userId);
          if (am) am.role = role;
        }
      });
    },

    createAccount: async (name) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create account');
      }
      const acc = await res.json();
      set((s) => { s.accounts.push(acc); });
    },
  }))
);

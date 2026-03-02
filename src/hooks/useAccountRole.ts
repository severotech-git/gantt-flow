import { useSession } from 'next-auth/react';
import { useAccountStore } from '@/store/useAccountStore';

export type AccountRole = 'owner' | 'admin' | 'member' | null;

/**
 * Returns the current user's role in the active account.
 * Returns null while loading or if the user has no account.
 */
export function useAccountRole(): AccountRole {
  const { data: session } = useSession();
  const accounts = useAccountStore((s) => s.accounts);

  const activeAccountId = session?.user?.activeAccountId;
  if (!activeAccountId) return null;

  const account = accounts.find((a) => a._id === activeAccountId);
  return (account?.role as AccountRole) ?? null;
}

export function useCanManage(): boolean {
  const role = useAccountRole();
  return role === 'owner' || role === 'admin';
}

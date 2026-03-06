'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCanManage, useAccountRole } from '@/hooks/useAccountRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteMemberDialog } from '@/components/dialogs/InviteMemberDialog';
import { UserPlus, Trash2, Loader2, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TeamSection() {
  const t = useTranslations('settings.team');
  const router = useRouter();
  const { data: session } = useSession();
  const activeAccountId = session?.user?.activeAccountId;
  const members = useAccountStore((s) => s.members);
  const fetchMembers = useAccountStore((s) => s.fetchMembers);
  const removeMember = useAccountStore((s) => s.removeMember);
  const updateMemberRole = useAccountStore((s) => s.updateMemberRole);
  const cancelInvitation = useAccountStore((s) => s.cancelInvitation);
  const fetchInvitations = useAccountStore((s) => s.fetchInvitations);
  const invitations = useAccountStore((s) => s.invitations);
  const { users } = useSettingsStore();

  const canManage = useCanManage();
  const currentRole = useAccountRole();
  const [showInvite, setShowInvite] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [cancellingToken, setCancellingToken] = useState<string | null>(null);

  useEffect(() => {
    if (activeAccountId) {
      fetchMembers(activeAccountId);
      fetchInvitations();
    }
  }, [activeAccountId, fetchMembers, fetchInvitations]);

  const currentUserId = session?.user?.id;

  const handleRemove = async (userId: string) => {
    if (!activeAccountId) return;
    setRemovingUserId(userId);
    try {
      await removeMember(activeAccountId, userId);
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!activeAccountId) return;
    setUpdatingRoleUserId(userId);
    try {
      await updateMemberRole(activeAccountId, userId, role);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleCancelInvitation = async (token: string) => {
    setCancellingToken(token);
    try {
      await cancelInvitation(token);
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingToken(null);
    }
  };

  /** Determine whether the current user can change the target member's role */
  const canChangeRole = (targetRole: string, targetUserId: string) => {
    if (!canManage) return false;
    if (targetUserId === currentUserId) return false;
    if (targetRole === 'owner') return false;
    // Admins can only manage plain members
    if (currentRole === 'admin' && targetRole === 'admin') return false;
    return true;
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t.rich('subtitle', {
            link: (chunks) => (
              <button
                className="text-primary hover:underline"
                onClick={() => router.push('/settings?section=users')}
              >
                {chunks}
              </button>
            ),
          })}
        </p>
      </div>

      {/* Members */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{t('membersTitle')}</h3>
          {canManage && (
            <Button size="sm" onClick={() => setShowInvite(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
              <UserPlus size={14} className="mr-1.5" />
              {t('inviteButton')}
            </Button>
          )}
        </div>

        <div className="divide-y divide-border rounded-md border border-border">
          {members.map((m) => {
            const isYou = m.userId === currentUserId;
            const isRemoving = removingUserId === m.userId;
            const isUpdatingRole = updatingRoleUserId === m.userId;
            const displayName = users.find((u) => u.uid === m.userId)?.name ?? m.user?.name ?? m.userId;
            const roleChangeable = canChangeRole(m.role, m.userId);

            return (
              <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                  {displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {displayName}
                    {isYou && <span className="ml-2 text-[10px] text-muted-foreground">{t('youLabel')}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                </div>

                {/* Role badge — dropdown if editable */}
                {roleChangeable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-0.5 text-[10px] border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors shrink-0"
                        disabled={isUpdatingRole}
                      >
                        {isUpdatingRole
                          ? <Loader2 size={10} className="animate-spin mr-1" />
                          : null}
                        {t(`roles.${m.role}` as Parameters<typeof t>[0]) ?? m.role}
                        <ChevronDown size={10} className="ml-0.5 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[110px]">
                      {(['admin', 'member'] as const).map((r) => (
                        <DropdownMenuItem
                          key={r}
                          onSelect={() => r !== m.role && handleRoleChange(m.userId, r)}
                          className="flex items-center gap-2"
                        >
                          <Check size={12} className={r === m.role ? 'opacity-100' : 'opacity-0'} />
                          {t(`roles.${r}`)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {t(`roles.${m.role}` as Parameters<typeof t>[0]) ?? m.role}
                  </Badge>
                )}

                {canManage && !isYou && m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(m.userId)}
                    disabled={isRemoving}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                    title={t('removeMemberTitle')}
                  >
                    {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">{t('noMembers')}</p>
          )}
        </div>
      </section>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t('pendingInvitations')}</h3>
          <div className="divide-y divide-border rounded-md border border-border">
            {invitations.map((inv) => {
              const isCancelling = cancellingToken === inv.token;
              return (
                <div key={inv._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{inv.role}</Badge>
                  <Badge className="text-[10px] shrink-0 bg-yellow-100 text-yellow-800 border-yellow-200">
                    {t('pendingBadge')}
                  </Badge>
                  {canManage && (
                    <button
                      onClick={() => handleCancelInvitation(inv.token)}
                      disabled={isCancelling}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      title={t('cancelInvitationTitle')}
                    >
                      {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <InviteMemberDialog open={showInvite} onOpenChange={setShowInvite} />
    </div>
  );
}

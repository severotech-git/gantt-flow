'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAccountStore } from '@/store/useAccountStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PendingInvitesDialog } from '@/components/dialogs/PendingInvitesDialog';

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const fetchPendingInvitations = useAccountStore((s) => s.fetchPendingInvitations);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const pendingInvites = useAccountStore((s) => s.pendingInvites);
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchAccounts();
    fetchSettings();
    fetchPendingInvitations().then(() => {
      const { pendingInvites: invites } = useAccountStore.getState();
      if (invites.length > 0) setShowPendingDialog(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Show dialog whenever new pending invites arrive
  useEffect(() => {
    if (pendingInvites.length > 0) setShowPendingDialog(true);
  }, [pendingInvites.length]);

  return (
    <>
      {children}
      {showPendingDialog && (
        <PendingInvitesDialog
          open={showPendingDialog}
          onOpenChange={setShowPendingDialog}
        />
      )}
    </>
  );
}

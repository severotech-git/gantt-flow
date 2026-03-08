'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { PendingInvitesDialog } from '@/components/dialogs/PendingInvitesDialog';

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const fetchPendingInvitations = useAccountStore((s) => s.fetchPendingInvitations);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const [showPendingDialog, setShowPendingDialog] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchAccounts();
    fetchSettings().then(() => {
      // After login, force locale and theme from the user's DB profile.
      // This overrides anything the user may have set on the login/register pages.
      const { locale } = useSettingsStore.getState();
      const cookieLocale = document.cookie
        .split('; ')
        .find((r) => r.startsWith('NEXT_LOCALE='))
        ?.split('=')[1];
      if (locale && locale !== cookieLocale) {
        document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      }
      // Clear the ThemeToggle localStorage key so the authenticated ThemeProvider wins.
      localStorage.removeItem('ganttflow-theme');
    });
    fetchPendingInvitations().then(() => {
      const { pendingInvites: invites } = useAccountStore.getState();
      if (invites.length > 0 && session?.user?.emailVerified) {
        setTimeout(() => setShowPendingDialog(true), 5000);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // router/fetch refs are stable; re-running only on auth status change is intentional


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

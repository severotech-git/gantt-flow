'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountStore } from '@/store/useAccountStore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface PendingInvitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingInvitesDialog({ open, onOpenChange }: PendingInvitesDialogProps) {
  const router = useRouter();
  const { update } = useSession();
  const pendingInvites = useAccountStore((s) => s.pendingInvites);
  const acceptInvitation = useAccountStore((s) => s.acceptInvitation);
  const rejectInvitation = useAccountStore((s) => s.rejectInvitation);
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  const handleAccept = async (token: string) => {
    setLoadingToken(token);
    try {
      const accountId = await acceptInvitation(token);
      // Switch to the new account
      await update({ activeAccountId: accountId });
      router.refresh();
      if (useAccountStore.getState().pendingInvites.length === 0) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingToken(null);
    }
  };

  const handleReject = async (token: string) => {
    setLoadingToken(token);
    try {
      await rejectInvitation(token);
      if (useAccountStore.getState().pendingInvites.length === 0) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingToken(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pending Invitations</DialogTitle>
          <DialogDescription>
            You have been invited to join the following workspaces.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pendingInvites.map((inv) => {
            const isLoading = loadingToken === inv.token;
            const expiry = formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true });
            return (
              <div
                key={inv._id}
                className="flex items-start justify-between gap-4 rounded-md border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{inv.accountName}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by <span className="text-foreground">{inv.inviterName}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{inv.role}</Badge>
                    <span className="text-[11px] text-muted-foreground">Expires {expiry}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleReject(inv.token)}
                  >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Decline'}
                  </Button>
                  <Button
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleAccept(inv.token)}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Accept'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Remind me later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

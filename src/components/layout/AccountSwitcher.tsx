'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/useAccountStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, Star, Settings, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AccountSwitcher({ side = 'bottom' }: { side?: 'top' | 'bottom' }) {
  const t = useTranslations('layout.accountSwitcher');
  const { data: session, update } = useSession();
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const mainAccountId = useAccountStore((s) => s.mainAccountId);
  const switchAccount = useAccountStore((s) => s.switchAccount);

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  const activeAccountId = session?.user?.activeAccountId;
  const activeAccount = accounts.find((a) => a._id === activeAccountId);
  const displayName = activeAccount?.name ?? t('selectWorkspace');

  const handleSwitch = async (accountId: string) => {
    if (accountId === activeAccountId) { setOpen(false); return; }
    setSwitching(accountId);
    try {
      await switchAccount(accountId);
      await update({ activeAccountId: accountId });
      setOpen(false);
      router.refresh();
      window.location.href = '/projects';
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-4 h-9 w-full hover:bg-accent/50 transition-colors text-left">
          <span className="flex-1 font-semibold text-sm truncate text-foreground">{displayName}</span>
          <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-1" align="start" side={side}>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-1.5">
          {t('workspaces')}
        </div>

        {accounts.map((acc) => {
          const isActive = acc._id === activeAccountId;
          const isMain = acc._id === mainAccountId;
          const isSwitching = switching === acc._id;
          return (
            <div
              key={acc._id}
              role="button"
              tabIndex={isSwitching ? -1 : 0}
              onClick={() => handleSwitch(acc._id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSwitch(acc._id); }}
              aria-disabled={isSwitching}
              className={cn(
                'flex items-center gap-2 w-full rounded px-3 py-2 text-sm text-left transition-colors cursor-pointer',
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                isSwitching && 'pointer-events-none opacity-60'
              )}
            >
              {isSwitching
                ? <Loader2 size={12} className="animate-spin shrink-0" />
                : <span className="w-2 h-2 rounded-full shrink-0 bg-primary" style={{ opacity: isActive ? 1 : 0.4 }} />
              }
              <span className="flex-1 truncate">{acc.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{acc.role}</Badge>
              {isMain && (
                <span title={t('defaultWorkspaceTitle')}>
                  <Star size={11} className="shrink-0 fill-yellow-400 text-yellow-400" />
                </span>
              )}
            </div>
          );
        })}

        <div className="border-t border-border mt-1 pt-1">
          <button
            onClick={() => { setOpen(false); router.push('/settings?section=accounts'); }}
            className="flex items-center gap-2 w-full rounded px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Settings size={13} />
            {t('manageWorkspaces')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

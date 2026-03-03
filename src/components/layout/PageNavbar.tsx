'use client';

import { PanelLeftClose, PanelLeftOpen, LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PageNavbarProps {
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Rendered immediately after the title (left / center area) */
  titleActions?: ReactNode;
  /** Rendered on the far right */
  actions?: ReactNode;
}

export function PageNavbar({
  title,
  sidebarOpen,
  onToggleSidebar,
  titleActions,
  actions,
}: PageNavbarProps) {
  const { data: session } = useSession();
  const t = useTranslations('layout.navbar');

  return (
    <header className="flex items-center h-12 px-4 gap-3 border-b border-border bg-surface-2 shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? t('hideSidebar') : t('showSidebar')}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      >
        {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
      </button>

      {/* Title */}
      <h1 className="font-semibold text-sm text-foreground truncate shrink-0">
        {title}
      </h1>

      {/* Slot: next to title */}
      {titleActions && (
        <div className="flex items-center gap-2 min-w-0">
          {titleActions}
        </div>
      )}

      <div className="flex-1" />

      {/* Slot: right side */}
      <div className="flex items-center gap-4 shrink-0">
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-accent transition-colors focus:outline-none text-left">
                <OwnerAvatar
                  name={session.user.name || 'User'}
                  size={28}
                  className="shrink-0"
                />
                <div className="hidden sm:flex flex-col pr-1">
                  <p className="text-[13px] font-medium leading-none text-foreground truncate max-w-[120px]">
                    {session.user.name}
                  </p>
                  <p className="text-[11px] leading-none text-muted-foreground truncate max-w-[120px] mt-1">
                    {session.user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal sm:hidden">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session.user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="sm:hidden" />
              <Link href="/settings?section=profile">
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('myProfile')}</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>{t('settings')}</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

'use client';

import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/useNotificationStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const { unreadCount } = useNotificationStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px] h-[18px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}

'use client';

import { usePresenceStore } from '@/store/usePresenceStore';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import { useTranslations } from 'next-intl';

export function PresenceAvatars() {
  const connectedUsers = usePresenceStore((s) => s.connectedUsers);
  const isConnected = usePresenceStore((s) => s.isConnected);
  const t = useTranslations('gantt.presence');

  if (!isConnected || connectedUsers.length <= 1) return null;

  // Show up to 5 avatars, then a "+N" indicator
  const visible = connectedUsers.slice(0, 5);
  const overflow = connectedUsers.length - visible.length;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {visible.map((user) => (
          <OwnerAvatar
            key={user.userId}
            name={user.name}
            color={user.color}
            size={24}
            className="ring-2 ring-background"
          />
        ))}
        {overflow > 0 && (
          <span
            className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-2xs font-medium text-muted-foreground ring-2 ring-background shrink-0"
            title={t('moreUsers', { count: overflow })}
          >
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-2xs text-muted-foreground hidden sm:inline">
        {t('viewing', { count: connectedUsers.length })}
      </span>
    </div>
  );
}

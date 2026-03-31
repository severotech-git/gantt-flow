'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useRouter } from 'next/navigation';
import { MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotificationDropdown() {
  const t = useTranslations('notifications');
  const { notifications, isLoading, hasMore, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const router = useRouter();

  useEffect(() => {
    fetchNotifications(0).catch(() => {});
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'comment':
      case 'mention':
        return <MessageCircle size={16} />;
      case 'status-change':
      case 'item-update':
        return <CheckCircle size={16} />;
      case 'assignment':
        return <AlertCircle size={16} />;
      default:
        return <MessageCircle size={16} />;
    }
  };

  const handleNotificationClick = async (notificationId: string, projectId: string, itemPath: any) => {
    await markAsRead(notificationId);
    const query = new URLSearchParams();
    query.set('open', [itemPath.epicId, itemPath.featureId, itemPath.taskId].filter(Boolean).join(','));
    router.push(`/projects/${projectId}?${query.toString()}`);
  };

  return (
    <div className="flex flex-col h-[400px] bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <h3 className="font-semibold text-sm">{t('title')}</h3>
        {notifications.length > 0 && (
          <button
            onClick={() => markAllAsRead().catch(() => {})}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t('noNotifications')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                onClick={() =>
                  handleNotificationClick(notification._id, notification.projectId, notification.itemPath)
                }
                className={cn(
                  'w-full text-left p-3 hover:bg-muted transition-colors flex gap-3 items-start',
                  !notification.read && 'bg-muted/50'
                )}
              >
                <div className="text-muted-foreground shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight line-clamp-2">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Load more button */}
      {hasMore && notifications.length > 0 && (
        <div className="border-t border-border p-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              const nextPage = Math.floor(notifications.length / 20);
              fetchNotifications(nextPage).catch(() => {});
            }}
          >
            {t('viewAll')}
          </Button>
        </div>
      )}
    </div>
  );
}

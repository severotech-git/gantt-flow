'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRouter } from 'next/navigation';
import {
  MessageCircle, CheckCircle, AlertCircle, Pencil,
  X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { INotification, NotificationLevel } from '@/types/index';

type Tab = 'unread' | 'read';

// ─── Relative time ────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string, t: (key: string, opts?: { count: number }) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('justNow');
  if (diffMin < 60) return t('minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('hoursAgo', { count: diffHour });
  if (diffDay === 1) return t('yesterday');
  if (diffDay < 7) return t('daysAgo', { count: diffDay });
  return date.toLocaleDateString();
}

// ─── Icon & color mapping per type ───────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badgeColor: string;
  badgeBg: string;
}> = {
  mention: {
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    badgeColor: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  comment: {
    icon: MessageCircle,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    badgeColor: 'text-sky-700 dark:text-sky-300',
    badgeBg: 'bg-sky-100 dark:bg-sky-900/40',
  },
  'status-change': {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    badgeColor: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
  assignment: {
    icon: AlertCircle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    badgeColor: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/40',
  },
  'item-update': {
    icon: Pencil,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    badgeColor: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-100 dark:bg-violet-900/40',
  },
};

// ─── Level dot colors ─────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<NotificationLevel, string> = {
  epic: 'bg-purple-500',
  feature: 'bg-amber-500',
  task: 'bg-teal-500',
};

// ─── Main component ────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const t = useTranslations('notifications');
  const {
    notifications, isLoading, hasMore, currentPage,
    readNotifications, readIsLoading, readHasMore, readCurrentPage,
    fetchNotifications, fetchReadNotifications,
    markAsRead, markAllAsRead, dismissNotification,
    unreadCount,
  } = useNotificationStore();
  const levelNames = useSettingsStore((s) => s.levelNames);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('unread');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchNotifications(0).catch(() => {}); }, []);

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    setSelectedProjectId('all');
    if (newTab === 'read' && readNotifications.length === 0) {
      fetchReadNotifications(0).catch(() => {});
    }
  }

  const loadMore = useCallback(() => {
    if (tab === 'unread') {
      fetchNotifications(currentPage + 1).catch(() => {});
    } else {
      fetchReadNotifications(readCurrentPage + 1).catch(() => {});
    }
  }, [tab, currentPage, readCurrentPage, fetchNotifications, fetchReadNotifications]);

  // Collect unique projects from both lists — memoized to avoid O(n*m) per render
  const allProjects = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string }>();
    for (const n of notifications) {
      if (!projectMap.has(n.projectId)) {
        projectMap.set(n.projectId, { id: n.projectId, name: n.projectName });
      }
    }
    for (const n of readNotifications) {
      if (!projectMap.has(n.projectId)) {
        projectMap.set(n.projectId, { id: n.projectId, name: n.projectName });
      }
    }
    return Array.from(projectMap.values());
  }, [notifications, readNotifications]);

  // Filtered list — memoized
  const { filteredList, activeIsLoading, activeHasMore } = useMemo(() => {
    const baseList = tab === 'unread' ? notifications : readNotifications;
    const filtered = selectedProjectId === 'all'
      ? baseList
      : baseList.filter((n) => n.projectId === selectedProjectId);
    return {
      filteredList: filtered,
      activeIsLoading: tab === 'unread' ? isLoading : readIsLoading,
      activeHasMore: tab === 'unread' ? hasMore : readHasMore,
    };
  }, [tab, notifications, readNotifications, selectedProjectId, isLoading, readIsLoading, hasMore, readHasMore]);

  const handleNotificationClick = useCallback(async (
    notificationId: string,
    projectId: string,
    itemPath: { epicId: string; featureId?: string; taskId?: string },
    isRead: boolean,
  ) => {
    if (navigatingId) return; // prevent double navigation
    setNavigatingId(notificationId);
    try {
      if (!isRead) await markAsRead(notificationId);
      const query = new URLSearchParams();
      query.set('open', [itemPath.epicId, itemPath.featureId, itemPath.taskId].filter(Boolean).join(','));
      router.push(`/projects/${projectId}?${query.toString()}`);
    } finally {
      setNavigatingId(null);
    }
  }, [navigatingId, markAsRead, router]);

  const handleDismiss = useCallback(async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (dismissingId) return;
    setDismissingId(notificationId);
    try {
      await dismissNotification(notificationId);
    } finally {
      setDismissingId(null);
    }
  }, [dismissingId, dismissNotification]);

  // ─── Empty state ────────────────────────────────────────────────────────────

  if (!activeIsLoading && filteredList.length === 0) {
    const emptyMsg = selectedProjectId !== 'all'
      ? t('noProjectNotifications')
      : tab === 'unread'
        ? t('noNotifications')
        : t('noReadNotifications');

    return (
      <div className="flex flex-col h-[420px] bg-background">
        <DropdownHeader
          tab={tab}
          onTabChange={handleTabChange}
          unreadCount={unreadCount}
          onMarkAllRead={() => markAllAsRead().catch(() => {})}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle size={22} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{emptyMsg}</p>
            {tab === 'unread' && selectedProjectId === 'all' && (
              <p className="text-xs text-muted-foreground mt-1">{t('noNotificationsHint')}</p>
            )}
          </div>
        </div>
        {allProjects.length > 1 && (
          <div className="border-t border-border p-3 shrink-0">
            <ProjectFilter
              projects={allProjects}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              t={t}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[420px] bg-background">
      {/* Header */}
      <DropdownHeader
        tab={tab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
        onMarkAllRead={() => markAllAsRead().catch(() => {})}
      />

      {/* Project filter */}
      {allProjects.length > 1 && (
        <div className="px-3 pb-2 shrink-0">
          <ProjectFilter
            projects={allProjects}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            t={t}
          />
        </div>
      )}

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {activeIsLoading && filteredList.length === 0 ? (
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            {t('loading')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredList.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                t={t}
                levelNames={levelNames}
                isNavigating={navigatingId === notification._id}
                isDismissing={dismissingId === notification._id}
                onClick={() =>
                  handleNotificationClick(
                    notification._id,
                    notification.projectId,
                    notification.itemPath,
                    notification.read,
                  )
                }
                onDismiss={(e) => handleDismiss(e, notification._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load more */}
      {activeHasMore && filteredList.length > 0 && (
        <div className="border-t border-border p-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={loadMore}
          >
            {t('loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DropdownHeader({
  tab,
  onTabChange,
  unreadCount,
  onMarkAllRead,
}: {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  const t = useTranslations('notifications');

  return (
    <div className="shrink-0">
      {/* Title row */}
      <div className="flex items-center justify-between px-3 pt-3 pb-0">
        <h3 className="font-semibold text-sm">{t('title')}</h3>
        {tab === 'unread' && unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-3 pt-2 border-b border-border">
        <button
          onClick={() => onTabChange('unread')}
          className={cn(
            'text-xs font-medium pb-2 px-1 mr-4 border-b-2 transition-colors',
            tab === 'unread'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t('tabUnread')}
        </button>
        <button
          onClick={() => onTabChange('read')}
          className={cn(
            'text-xs font-medium pb-2 px-1 border-b-2 transition-colors',
            tab === 'read'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t('tabRead')}
        </button>
      </div>
    </div>
  );
}

function ProjectFilter({
  projects,
  value,
  onChange,
  t,
}: {
  projects: Array<{ id: string; name: string }>;
  value: string;
  onChange: (v: string) => void;
  t: (key: string) => string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs w-full justify-start gap-1.5 pl-2 pr-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('allProjects')}</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className="truncate max-w-[200px]">{p.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NotificationItem({
  notification,
  t,
  levelNames,
  isNavigating,
  isDismissing,
  onClick,
  onDismiss,
}: {
  notification: INotification;
  t: (key: string) => string;
  levelNames: { epic: string; feature: string; task: string };
  isNavigating: boolean;
  isDismissing: boolean;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG['item-update'];
  const Icon = cfg.icon;

  // Build breadcrumb
  const parts: string[] = [];
  if (notification.level === 'epic') {
    parts.push(notification.itemName);
  } else {
    if (notification.featureName && notification.featureName !== notification.itemName) {
      parts.push(notification.featureName);
    }
    parts.push(notification.itemName);
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 hover:bg-muted/60 transition-colors cursor-pointer',
        !notification.read && 'bg-muted/40',
        isNavigating && 'opacity-70 pointer-events-none',
      )}
      onClick={onClick}
    >
      {/* Unread dot */}
      {!notification.read && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5', cfg.bgColor)}>
        <Icon size={15} className={cfg.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Action badge + time */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide', cfg.badgeBg, cfg.badgeColor)}>
            {t(`actions.${notification.type}`)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(notification.createdAt, t)}
          </span>
        </div>

        {/* Item name / breadcrumb */}
        <p className="text-sm font-medium leading-tight line-clamp-1 text-foreground">
          {parts.join(' › ')}
        </p>

        {/* Actor + project */}
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {notification.actorName}
          <span className="mx-1">·</span>
          <span className="truncate">{notification.projectName}</span>
        </p>

        {/* Level indicator dots — ancestors only, no dot for the item itself */}
        <div className="flex items-center gap-1 mt-1">
          {notification.level !== 'epic' && (
            <>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', LEVEL_COLORS.epic)} />
                {levelNames.epic}
              </span>
              {notification.level === 'task' && (
                <>
                  <span className="text-muted-foreground/40">›</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', LEVEL_COLORS.feature)} />
                    {levelNames.feature}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Loading spinner on navigation */}
      {isNavigating && (
        <div className="shrink-0 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Dismiss button — reveal on hover */}
      {!isNavigating && (
        <button
          onClick={onDismiss}
          disabled={isDismissing}
          className={cn(
            'absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground',
            isDismissing && 'opacity-50 cursor-not-allowed',
          )}
          title={t('dismiss')}
        >
          {isDismissing
            ? <Loader2 size={12} className="animate-spin" />
            : <X size={12} />}
        </button>
      )}
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { NotificationChannel } from '@/types/index';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function NotificationsSection() {
  const t = useTranslations('settings.notifications');
  const { notificationPreferences, setNotificationPreferences } = useSettingsStore();

  const channels: NotificationChannel[] = ['off', 'in-app', 'email', 'both'];

  const handleChange = (category: 'itemsCreated' | 'itemsOwned' | 'mentions', value: NotificationChannel) => {
    setNotificationPreferences({
      ...notificationPreferences,
      [category]: value,
    });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('subtitle')}</p>

      <div className="space-y-6">
        {/* Items Created */}
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <label className="text-sm font-medium">{t('itemsCreated')}</label>
          </div>
          <Select value={notificationPreferences.itemsCreated} onValueChange={(v) => handleChange('itemsCreated', v as NotificationChannel)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {t(`channels.${ch}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items Owned */}
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <label className="text-sm font-medium">{t('itemsOwned')}</label>
          </div>
          <Select value={notificationPreferences.itemsOwned} onValueChange={(v) => handleChange('itemsOwned', v as NotificationChannel)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {t(`channels.${ch}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mentions */}
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <label className="text-sm font-medium">{t('mentions')}</label>
          </div>
          <Select value={notificationPreferences.mentions} onValueChange={(v) => handleChange('mentions', v as NotificationChannel)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {t(`channels.${ch}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

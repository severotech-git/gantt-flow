'use client';

import { cn } from '@/lib/utils';
import { Sun, Tag, Layers2, CalendarDays, User, UsersRound, UserCheck, Building2, Globe, CreditCard } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Section = 'profile' | 'team' | 'users' | 'theme' | 'statuses' | 'levels' | 'calendar' | 'accounts' | 'language' | 'billing';

type GroupDef = {
  groupKey: string;
  items: { id: Section; itemKey: string; icon: React.ReactNode }[];
};

const GROUPS: GroupDef[] = [
  {
    groupKey: 'account',
    items: [
      { id: 'accounts', itemKey: 'workspaces', icon: <Building2 size={15} /> },
      { id: 'team',     itemKey: 'team',       icon: <UsersRound size={15} /> },
      { id: 'billing',  itemKey: 'billing',    icon: <CreditCard size={15} /> },
    ],
  },
  {
    groupKey: 'customization',
    items: [
      { id: 'users',    itemKey: 'assignees', icon: <UserCheck size={15} /> },
      { id: 'levels',   itemKey: 'levels',    icon: <Layers2 size={15} /> },
      { id: 'statuses', itemKey: 'statuses',  icon: <Tag size={15} /> },
      { id: 'calendar', itemKey: 'calendar',  icon: <CalendarDays size={15} /> },
    ],
  },
  {
    groupKey: 'user',
    items: [
      { id: 'profile',  itemKey: 'profile',  icon: <User size={15} /> },
      { id: 'language', itemKey: 'language', icon: <Globe size={15} /> },
      { id: 'theme',    itemKey: 'theme',    icon: <Sun size={15} /> },
    ],
  },
];

export type SettingsSection = Section;

interface SettingsSectionNavProps {
  active: Section;
  onChange: (s: Section) => void;
}

export function SettingsSectionNav({ active, onChange }: SettingsSectionNavProps) {
  const t = useTranslations('settings.nav');

  return (
    <nav className="w-48 shrink-0 border-r border-border py-4 flex flex-col gap-4">
      {GROUPS.map((group) => (
        <div key={group.groupKey}>
          <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {t(`groups.${group.groupKey}`)}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((s) => (
              <button
                key={s.id}
                onClick={() => onChange(s.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-colors w-full',
                  active === s.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <span className="shrink-0 text-muted-foreground">{s.icon}</span>
                {t(`items.${s.itemKey}`)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

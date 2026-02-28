'use client';

import { cn } from '@/lib/utils';
import { Users, Sun, Tag, Layers2, CalendarDays } from 'lucide-react';

type Section = 'users' | 'theme' | 'statuses' | 'levels' | 'calendar';

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'theme',    label: 'Theme',         icon: <Sun size={15} /> },
  { id: 'users',    label: 'Team Members',  icon: <Users size={15} /> },
  { id: 'levels',   label: 'Level Names',   icon: <Layers2 size={15} /> },
  { id: 'statuses', label: 'Status List',   icon: <Tag size={15} /> },
  { id: 'calendar', label: 'Calendar',      icon: <CalendarDays size={15} /> },
];

export type SettingsSection = Section;

interface SettingsSectionNavProps {
  active: Section;
  onChange: (s: Section) => void;
}

export function SettingsSectionNav({ active, onChange }: SettingsSectionNavProps) {
  return (
    <nav className="w-48 shrink-0 border-r border-border py-4 flex flex-col gap-0.5">
      {SECTIONS.map((s) => (
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
          {s.label}
        </button>
      ))}
    </nav>
  );
}

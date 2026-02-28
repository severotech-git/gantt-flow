'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SettingsSectionNav, SettingsSection } from '@/components/settings/SettingsSectionNav';
import { UsersSection } from '@/components/settings/UsersSection';
import { ThemeSection } from '@/components/settings/ThemeSection';
import { StatusConfigSection } from '@/components/settings/StatusConfigSection';
import { LevelNamesSection } from '@/components/settings/LevelNamesSection';
import { CalendarSection } from '@/components/settings/CalendarSection';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('theme');
  const isSaving = useSettingsStore((s) => s.isSaving);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onNewProject={() => {}} />

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 h-12 border-b border-border shrink-0">
          <h1 className="text-sm font-semibold text-foreground">Settings</h1>
          {isSaving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <SettingsSectionNav active={section} onChange={setSection} />

          <div className="flex-1 overflow-y-auto p-8">
            {section === 'theme'    && <ThemeSection />}
            {section === 'users'    && <UsersSection />}
            {section === 'levels'   && <LevelNamesSection />}
            {section === 'statuses' && <StatusConfigSection />}
            {section === 'calendar' && <CalendarSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

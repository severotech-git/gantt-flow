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
import { PageNavbar } from '@/components/layout/PageNavbar';

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('theme');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isSaving = useSettingsStore((s) => s.isSaving);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onNewProject={() => {}} collapsed={sidebarCollapsed} />

      <main className="flex flex-col flex-1 overflow-hidden">
        <PageNavbar
          title="Settings"
          sidebarOpen={!sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          actions={
            isSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </div>
            ) : undefined
          }
        />

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

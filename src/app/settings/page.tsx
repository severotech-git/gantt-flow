'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SettingsSectionNav, SettingsSection } from '@/components/settings/SettingsSectionNav';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { UsersSection } from '@/components/settings/UsersSection';
import { ThemeSection } from '@/components/settings/ThemeSection';
import { StatusConfigSection } from '@/components/settings/StatusConfigSection';
import { LevelNamesSection } from '@/components/settings/LevelNamesSection';
import { CalendarSection } from '@/components/settings/CalendarSection';
import { Loader2 } from 'lucide-react';
import { PageNavbar } from '@/components/layout/PageNavbar';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isSaving = useSettingsStore((s) => s.isSaving);

  // Derive active section from URL (Source of Truth)
  const querySection = searchParams.get('section') as SettingsSection;
  const validSections: SettingsSection[] = ['theme', 'users', 'levels', 'statuses', 'calendar', 'profile'];
  const activeSection = validSections.includes(querySection) ? querySection : 'theme';

  const handleSectionChange = (newSection: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', newSection);
    router.replace(`/settings?${params.toString()}`);
  };

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
          <SettingsSectionNav active={activeSection} onChange={handleSectionChange} />

          <div className="flex-1 overflow-y-auto p-8">
            {activeSection === 'theme'    && <ThemeSection />}
            {activeSection === 'users'    && <UsersSection />}
            {activeSection === 'levels'   && <LevelNamesSection />}
            {activeSection === 'statuses' && <StatusConfigSection />}
            {activeSection === 'calendar' && <CalendarSection />}
            {activeSection === 'profile'  && <ProfileSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-muted-foreground" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}

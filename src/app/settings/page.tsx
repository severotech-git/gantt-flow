'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSettingsStore } from '@/store/useSettingsStore';
import { SettingsSectionNav, SettingsSection } from '@/components/settings/SettingsSectionNav';
import { UsersSection } from '@/components/settings/UsersSection';
import { ThemeSection } from '@/components/settings/ThemeSection';
import { StatusConfigSection } from '@/components/settings/StatusConfigSection';
import { LevelNamesSection } from '@/components/settings/LevelNamesSection';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>('users');
  const isSaving = useSettingsStore((s) => s.isSaving);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1117]">
      <Sidebar onNewProject={() => {}} />

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 h-12 border-b border-white/[0.06] shrink-0">
          <h1 className="text-sm font-semibold text-white">Settings</h1>
          {isSaving && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 size={12} className="animate-spin" />
              Saving…
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <SettingsSectionNav active={section} onChange={setSection} />

          <div className="flex-1 overflow-y-auto p-8">
            {section === 'users'    && <UsersSection />}
            {section === 'theme'    && <ThemeSection />}
            {section === 'statuses' && <StatusConfigSection />}
            {section === 'levels'   && <LevelNamesSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

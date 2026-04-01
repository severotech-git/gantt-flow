'use client';

import { Suspense } from 'react';
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
import { TeamSection } from '@/components/settings/TeamSection';
import { AccountsSection } from '@/components/settings/AccountsSection';
import { LanguageSection } from '@/components/settings/LanguageSection';
import { BillingSection } from '@/components/settings/BillingSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { Paywall } from '@/components/billing/Paywall';
import { Loader2 } from 'lucide-react';
import { PageNavbar } from '@/components/layout/PageNavbar';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSaving = useSettingsStore((s) => s.isSaving);
  const sidebarCollapse = useSettingsStore((s) => s.sidebarCollapse);
  const setSidebarCollapse = useSettingsStore((s) => s.setSidebarCollapse);

  // Derive active section from URL (Source of Truth)
  const querySection = searchParams.get('section') as SettingsSection;
  const validSections: SettingsSection[] = ['accounts', 'team', 'users', 'levels', 'statuses', 'calendar', 'profile', 'theme', 'language', 'billing', 'notifications'];
  const activeSection = validSections.includes(querySection) ? querySection : 'accounts';
  const showPaywall = searchParams.get('paywall') === '1';

  const handleSectionChange = (newSection: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', newSection);
    router.replace(`/settings?${params.toString()}`);
  };

  return (
    <div className="flex overflow-hidden bg-background" style={{ height: 'calc(100vh - var(--trial-banner-height, 0px))', marginTop: 'var(--trial-banner-height, 0px)' }}>
      {showPaywall && <Paywall />}
      <div id={showPaywall ? 'paywall-behind' : undefined} className="contents">
      <Sidebar collapse={sidebarCollapse} />

      <main className="flex flex-col flex-1 overflow-hidden">
        <PageNavbar
          title="Settings"
          sidebarOpen={sidebarCollapse === 'none'}
          onToggleSidebar={() => setSidebarCollapse(sidebarCollapse === 'none' ? 'icon' : 'none')}
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
            {activeSection === 'team'            && <TeamSection />}
            {activeSection === 'users'           && <UsersSection />}
            {activeSection === 'levels'          && <LevelNamesSection />}
            {activeSection === 'statuses'        && <StatusConfigSection />}
            {activeSection === 'calendar'        && <CalendarSection />}
            {activeSection === 'profile'         && <ProfileSection />}
            {activeSection === 'theme'           && <ThemeSection />}
            {activeSection === 'accounts'        && <AccountsSection />}
            {activeSection === 'language'        && <LanguageSection />}
            {activeSection === 'billing'         && <BillingSection />}
            {activeSection === 'notifications'   && <NotificationsSection />}
          </div>
        </div>
      </main>
      </div>
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

'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { GanttBoard } from '@/components/gantt/GanttBoard';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { SaveVersionDialog } from '@/components/dialogs/SaveVersionDialog';
import { SearchDialog } from '@/components/dialogs/SearchDialog';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const { fetchProject, fetchVersions, clearActiveProject } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchProject(id);
    fetchVersions(id);
    return () => clearActiveProject();
  }, [id, fetchProject, fetchVersions, clearActiveProject]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewProject={() => setNewProjectOpen(true)} collapsed={!sidebarOpen} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav
          onSaveVersion={() => setSaveVersionOpen(true)}
          onNewProject={() => setNewProjectOpen(true)}
          onSearch={() => setSearchOpen(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <GanttBoard />
      </div>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <SaveVersionDialog open={saveVersionOpen} onClose={() => setSaveVersionOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

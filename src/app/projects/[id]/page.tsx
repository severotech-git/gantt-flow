'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNavbar } from '@/components/gantt/TopNavbar';
import { GanttBoard } from '@/components/gantt/GanttBoard';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog';
import { SaveVersionDialog } from '@/components/dialogs/SaveVersionDialog';
import { SearchDialog } from '@/components/dialogs/SearchDialog';
import { useRouter } from 'next/navigation';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchProject, fetchVersions, clearActiveProject } = useProjectStore();
  const project = useProjectStore(selectDisplayProject);
  const isLoadingProject = useProjectStore((state) => state.isLoadingProject);
  const projectError = useProjectStore((state) => state.projectError);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchProject(id);
    fetchVersions(id);
    return () => clearActiveProject();
  }, [id, fetchProject, fetchVersions, clearActiveProject]);

  useEffect(() => {
    // Only redirect if loading is finished AND there's an explicit "Not Found" error
    if (!isLoadingProject && projectError === 'Not found') {
      router.push('/projects');
    }
  }, [isLoadingProject, projectError, router]);

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

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center bg-background" style={{ height: 'calc(100vh - var(--trial-banner-height, 0px))', marginTop: 'var(--trial-banner-height, 0px)' }}>
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mx-auto" />
          <p className="text-muted-foreground text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  // If there's an error that isn't a 404 (handled by redirect), show it here
  if (projectError && projectError !== 'Not found') {
    return (
      <div className="flex items-center justify-center bg-background p-4" style={{ height: 'calc(100vh - var(--trial-banner-height, 0px))', marginTop: 'var(--trial-banner-height, 0px)' }}>
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">{projectError}</p>
          <button 
            onClick={() => fetchProject(id)}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // If project is null and no error yet, we might still be in a transition.
  // The loading state above handles the initial load.
  if (!project) return null;

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - var(--trial-banner-height, 0px))', marginTop: 'var(--trial-banner-height, 0px)' }}>
      <Sidebar collapsed={!sidebarOpen} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNavbar
          onEditProject={() => setEditProjectOpen(true)}
          onSaveVersion={() => setSaveVersionOpen(true)}
          onNewProject={() => setNewProjectOpen(true)}
          onSearch={() => setSearchOpen(true)}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <GanttBoard />
      </div>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <EditProjectDialog open={editProjectOpen} onClose={() => setEditProjectOpen(false)} />
      <SaveVersionDialog open={saveVersionOpen} onClose={() => setSaveVersionOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useProjectStore, selectDisplayProject } from '@/store/useProjectStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNavbar } from '@/components/gantt/TopNavbar';
import { GanttBoard } from '@/components/gantt/GanttBoard';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ItemDetailDrawer } from '@/components/gantt/ItemDetailDrawer';
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog';
import { SaveVersionDialog } from '@/components/dialogs/SaveVersionDialog';
import { SearchDialog } from '@/components/dialogs/SearchDialog';
import { useSocket } from '@/hooks/useSocket';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// ─── ?open= query param handler (client-only, needs useSearchParams) ───────────

function OpenDrawerHandler({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openItem = useProjectStore((s) => s.openItem);
  const project = useProjectStore(selectDisplayProject);

  useEffect(() => {
    const open = searchParams.get('open');
    if (!open || !project) return;
    const parts = open.split(',').filter(Boolean);
    if (parts.length === 0) return;
    const epicId = parts[0];
    const featureId = parts[1];
    const taskId = parts[2];
    openItem({ epicId, ...(featureId ? { featureId } : {}), ...(taskId ? { taskId } : {}) });
    router.replace(`/projects/${projectId}`, { scroll: false });
  }, [searchParams, project, openItem, router, projectId]);

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchProject, fetchVersions, clearActiveProject } = useProjectStore();
  const project = useProjectStore(selectDisplayProject);
  const viewMode = useProjectStore((s) => s.viewMode);
  const isLoadingProject = useProjectStore((state) => state.isLoadingProject);
  const projectError = useProjectStore((state) => state.projectError);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarCollapse = useSettingsStore((s) => s.sidebarCollapse);
  const setSidebarCollapse = useSettingsStore((s) => s.setSidebarCollapse);

  // Real-time collaboration: connect to Socket.IO when project loads
  useSocket(id);

  useEffect(() => {
    fetchProject(id);
    fetchVersions(id);
    return () => clearActiveProject();
  }, [id, fetchProject, fetchVersions, clearActiveProject]);

  useEffect(() => {
    if (!isLoadingProject && projectError === 'Not found') {
      router.push('/projects');
    }
  }, [isLoadingProject, projectError, router]);

  // Global Cmd+F / Ctrl+F shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
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

  if (!project) return null;

  return (
    <>
      {/* Handles ?open= query param to open item drawer — must be in Suspense for useSearchParams */}
      <Suspense fallback={null}>
        <OpenDrawerHandler projectId={id} />
      </Suspense>

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - var(--trial-banner-height, 0px))', marginTop: 'var(--trial-banner-height, 0px)' }}>
        <Sidebar collapse={sidebarCollapse} />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TopNavbar
            onSaveVersion={() => setSaveVersionOpen(true)}
            sidebarOpen={sidebarCollapse === 'none'}
            onToggleSidebar={() => setSidebarCollapse(sidebarCollapse === 'none' ? 'icon' : 'none')}
          />

          {viewMode === 'gantt' ? <GanttBoard /> : <KanbanBoard />}
        </div>

        <ItemDetailDrawer />
        <EditProjectDialog open={editProjectOpen} onClose={() => setEditProjectOpen(false)} />
        <SaveVersionDialog open={saveVersionOpen} onClose={() => setSaveVersionOpen(false)} />
        <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </>
  );
}

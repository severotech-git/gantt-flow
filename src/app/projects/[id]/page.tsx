'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { GanttBoard } from '@/components/gantt/GanttBoard';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { SaveVersionDialog } from '@/components/dialogs/SaveVersionDialog';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);
  const { fetchProject, fetchVersions, clearActiveProject } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);

  useEffect(() => {
    fetchProject(id);
    fetchVersions(id);
    return () => clearActiveProject();
  }, [id, fetchProject, fetchVersions, clearActiveProject]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewProject={() => setNewProjectOpen(true)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav
          onSaveVersion={() => setSaveVersionOpen(true)}
          onNewProject={() => setNewProjectOpen(true)}
        />

        <GanttBoard />
      </div>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <SaveVersionDialog open={saveVersionOpen} onClose={() => setSaveVersionOpen(false)} />
    </div>
  );
}

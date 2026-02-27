'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import Link from 'next/link';
import { FolderKanban, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function ProjectsPage() {
  const { projects, fetchProjects } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewProject={() => setNewProjectOpen(true)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 h-12 border-b border-white/[0.06] shrink-0">
          <h1 className="text-sm font-semibold text-white">All Projects</h1>
          <Button
            size="sm"
            onClick={() => setNewProjectOpen(true)}
            className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
          >
            <Plus size={12} />
            New Project
          </Button>
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-600">
              <BarChart3 size={48} strokeWidth={1} />
              <p className="text-sm">No projects yet. Create your first one!</p>
              <Button
                onClick={() => setNewProjectOpen(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
              >
                <Plus size={14} />
                New Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((p) => (
                <Link
                  key={p._id}
                  href={`/projects/${p._id}`}
                  className="group flex flex-col gap-3 p-4 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: p.color ?? '#6366f1' }}
                    >
                      <FolderKanban size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {p.currentVersion}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-auto">
                    Updated {format(new Date(p.updatedAt), 'MMM d, yyyy')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  );
}

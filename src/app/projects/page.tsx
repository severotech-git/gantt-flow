'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageNavbar } from '@/components/layout/PageNavbar';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import { EditProjectDialog } from '@/components/dialogs/EditProjectDialog';
import Link from 'next/link';
import { FolderKanban, Plus, BarChart3, Archive, ArchiveRestore, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { IProject } from '@/types';

export default function ProjectsPage() {
  const {
    projects, archivedProjects, showArchived,
    fetchProjects, setShowArchived,
    archiveProject, unarchiveProject, deleteProject,
  } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editProject, setEditProject] = useState<Omit<IProject, 'epics'> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewProject={() => setNewProjectOpen(true)} collapsed={sidebarCollapsed} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <PageNavbar
          title="All Projects"
          sidebarOpen={!sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          actions={
            <Button
              size="sm"
              onClick={() => setNewProjectOpen(true)}
              className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1.5"
            >
              <Plus size={12} />
              New Project
            </Button>
          }
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {/* Active projects */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
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
                <ProjectCard
                  key={p._id}
                  project={p}
                  onArchive={() => archiveProject(p._id)}
                  onEdit={() => setEditProject(p)}
                />
              ))}
            </div>
          )}

          {/* Archived toggle */}
          <div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              {showArchived ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Archive size={13} />
              <span>Archived projects</span>
              {archivedProjects.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] tabular-nums">
                  {archivedProjects.length}
                </span>
              )}
            </button>

            {showArchived && (
              <div className="mt-4">
                {archivedProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 pl-6">No archived projects.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {archivedProjects.map((p) => (
                      <ArchivedProjectCard
                        key={p._id}
                        project={p}
                        onRestore={() => unarchiveProject(p._id)}
                        onDelete={() => setConfirmDelete(p._id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <EditProjectDialog
        open={!!editProject}
        project={editProject}
        onClose={() => setEditProject(null)}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-xl p-6 max-sm w-full mx-4 space-y-4 shadow-xl">
            <h2 className="text-sm font-semibold text-foreground">Delete project permanently?</h2>
            <p className="text-xs text-muted-foreground">
              This will permanently delete the project and all its snapshots. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white"
                onClick={() => { deleteProject(confirmDelete); setConfirmDelete(null); }}
              >
                Delete forever
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active project card ──────────────────────────────────────────────────────

function ProjectCard({
  project: p,
  onArchive,
  onEdit,
}: {
  project: Omit<IProject, 'epics'>;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="relative group flex flex-col gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-border/80 transition-all">
      <Link href={`/projects/${p._id}`} className="absolute inset-0 rounded-lg" aria-label={p.name} />

      <div className="flex items-start justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: p.color ?? '#6366f1' }}
        >
          <FolderKanban size={16} className="text-white" />
        </div>
        <div className="flex items-center gap-0.5 relative z-10">
          <button
            onClick={(e) => { e.preventDefault(); onEdit(); }}
            title="Edit project"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onArchive(); }}
            title="Archive project"
            className="p-2 rounded-md text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-violet-500 dark:group-hover:text-violet-300 transition-colors">
          {p.name}
        </h3>
        {p.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-auto">
        Updated {format(new Date(p.updatedAt), 'MMM d, yyyy')}
      </p>
    </div>
  );
}

// ─── Archived project card ───────────────────────────────────────────────────

function ArchivedProjectCard({
  project: p,
  onRestore,
  onDelete,
}: {
  project: Omit<IProject, 'epics'>;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border border-dashed bg-muted/20 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-start justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center grayscale"
          style={{ background: p.color ?? '#6366f1' }}
        >
          <FolderKanban size={16} className="text-white" />
        </div>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
          <Archive size={10} />
          Archived
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground line-through decoration-muted-foreground/40">
          {p.name}
        </h3>
        {p.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        Updated {format(new Date(p.updatedAt), 'MMM d, yyyy')}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
        >
          <ArchiveRestore size={12} />
          Restore
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, Settings, FolderKanban, Plus } from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  onNewProject: () => void;
  collapsed?: boolean;
}

export function Sidebar({ onNewProject, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const favorites = projects.slice(0, 3);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-surface-2 border-r border-border select-none overflow-hidden transition-all duration-200',
        collapsed ? 'w-0 border-r-0' : 'w-48 min-w-[192px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
        <span className="w-5 h-5 flex items-center justify-center">
          <Image src="/icon.png" alt="GanttFlow Logo" width={20} height={20} className="object-contain" />
        </span>
        <span className="font-bold text-sm tracking-tight text-foreground">GanttFlow</span>
      </div>

      {/* Favorites */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Favorites
          </span>
          <button
            onClick={onNewProject}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="New project"
          >
            <Plus size={13} />
          </button>
        </div>
        {favorites.map((p) => (
          <SidebarLink
            key={p._id}
            href={`/projects/${p._id}`}
            active={pathname === `/projects/${p._id}`}
            icon={<span className="w-2 h-2 rounded-full" style={{ background: p.color ?? '#6366f1' }} />}
            label={p.name}
          />
        ))}
        {favorites.length === 0 && (
          <p className="px-4 text-[11px] text-muted-foreground/60 italic">No favorites yet</p>
        )}
      </div>

      {/* Workspace */}
      <div className="mt-5">
        <div className="px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Workspace
          </span>
        </div>
        <SidebarLink
          href="/projects"
          active={pathname === '/projects'}
          icon={<LayoutGrid size={14} />}
          label="All Projects"
        />
      </div>

      <div className="flex-1" />

      {/* Bottom links */}
      <div className="border-t border-border py-2">
        <SidebarLink href="/settings" active={pathname === '/settings'} icon={<Settings size={14} />} label="Settings" />
      </div>
    </aside>
  );
}

function SidebarLink({ href, active, icon, label }: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-4 py-1.5 text-[13px] transition-colors rounded-none',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

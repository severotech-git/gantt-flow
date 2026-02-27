'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  CheckSquare,
  Calendar,
  Settings,
  HelpCircle,
  Star,
  FolderKanban,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  onNewProject: () => void;
}

export function Sidebar({ onNewProject }: SidebarProps) {
  const pathname = usePathname();
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const favorites = projects.slice(0, 3); // first 3 as "favorites" for now

  return (
    <aside className="flex flex-col w-48 min-w-[192px] h-screen bg-[#0d1117] border-r border-white/[0.06] select-none overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-white/[0.06]">
        <span className="text-violet-400">
          <FolderKanban size={18} />
        </span>
        <span className="font-bold text-sm tracking-tight text-white">MyGantt</span>
      </div>

      {/* Favorites */}
      <div className="mt-4">
        <div className="flex items-center justify-between px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Favorites
          </span>
          <button
            onClick={onNewProject}
            className="text-slate-500 hover:text-slate-300 transition-colors"
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
          <p className="px-4 text-[11px] text-slate-600 italic">No favorites yet</p>
        )}
      </div>

      {/* Workspace */}
      <div className="mt-5">
        <div className="px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </span>
        </div>
        <SidebarLink
          href="/projects"
          active={pathname === '/projects'}
          icon={<LayoutGrid size={14} />}
          label="All Projects"
        />
        <SidebarLink
          href="/projects"
          active={false}
          icon={<CheckSquare size={14} />}
          label="My Tasks"
        />
        <SidebarLink
          href="/projects"
          active={false}
          icon={<Calendar size={14} />}
          label="Calendar"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom links */}
      <div className="border-t border-white/[0.06] py-2">
        <SidebarLink href="/projects" active={false} icon={<Settings size={14} />} label="Workspace Settings" />
        <SidebarLink href="/projects" active={false} icon={<HelpCircle size={14} />} label="Help & Support" />
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  active,
  icon,
  label,
}: {
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
          ? 'bg-white/[0.07] text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
      )}
    >
      <span className="shrink-0 text-slate-500">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LayoutGrid, Settings, Plus } from 'lucide-react';
import { AccountSwitcher } from './AccountSwitcher';
import { NewProjectDialog } from '@/components/dialogs/NewProjectDialog';
import logoIcon from '../../../public/icon.png';
import { useTranslations } from 'next-intl';

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { projects, fetchProjects } = useProjectStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const t = useTranslations('sidebar');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const recent = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <>
    <aside
      className={cn(
        'flex flex-col h-full bg-surface-2 border-r border-border select-none overflow-hidden transition-all duration-200',
        collapsed ? 'w-0 border-r-0' : 'w-48 min-w-[192px]',
      )}
    >
      {/* Logo */}
      <Link href="/projects" className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0 hover:bg-accent/50 transition-colors">
        <span className="w-5 h-5 flex items-center justify-center shrink-0">
          <Image src={logoIcon} alt="GanttFlow Logo" width={20} height={20} className="object-contain" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-bold text-sm tracking-tight text-foreground">GanttFlow</span>
          <span className="text-[9px] text-muted-foreground -mt-0.5">by SeveroTech</span>
        </span>
      </Link>

      <div className="mt-1 border-b border-border">
        <AccountSwitcher />
      </div>

      {/* Recent */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('recent')}
          </span>
          <button
            onClick={() => setNewProjectOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={t('newProject')}
          >
            <Plus size={13} />
          </button>
        </div>
        {recent.map((p) => (
          <SidebarLink
            key={p._id}
            href={`/projects/${p._id}`}
            active={pathname === `/projects/${p._id}`}
            icon={<span className="w-2 h-2 rounded-full" style={{ background: p.color ?? '#6366f1' }} />}
            label={p.name}
          />
        ))}
        {recent.length === 0 && (
          <p className="px-4 text-[11px] text-muted-foreground/60 italic">{t('noProjectsYet')}</p>
        )}
      </div>

      {/* Workspace */}
      <div className="mt-5">
        <div className="px-4 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('workspace')}
          </span>
        </div>
        <SidebarLink
          href="/projects"
          active={pathname === '/projects'}
          icon={<LayoutGrid size={14} />}
          label={t('allProjects')}
        />
      </div>

      <div className="flex-1" />

      {/* Bottom: workspace switcher + settings */}
      <div className="border-t border-border pt-1 pb-2">
        <SidebarLink href="/settings" active={pathname === '/settings'} icon={<Settings size={14} />} label={t('settings')} />
      </div>
    </aside>

    <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </>
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

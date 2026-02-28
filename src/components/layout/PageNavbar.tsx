'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageNavbarProps {
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Rendered immediately after the title (left / center area) */
  titleActions?: ReactNode;
  /** Rendered on the far right */
  actions?: ReactNode;
}

export function PageNavbar({
  title,
  sidebarOpen,
  onToggleSidebar,
  titleActions,
  actions,
}: PageNavbarProps) {
  return (
    <header className="flex items-center h-12 px-4 gap-3 border-b border-border bg-surface-2 shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
      >
        {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
      </button>

      {/* Title */}
      <h1 className="font-semibold text-sm text-foreground truncate shrink-0">
        {title}
      </h1>

      {/* Slot: next to title */}
      {titleActions && (
        <div className="flex items-center gap-2 min-w-0">
          {titleActions}
        </div>
      )}

      <div className="flex-1" />

      {/* Slot: right side */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

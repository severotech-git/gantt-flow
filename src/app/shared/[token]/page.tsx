'use client';

import { useEffect, useState } from 'react';
import { GanttReadonlyBoard } from '@/components/gantt/GanttReadonlyBoard';
import { Loader2 } from 'lucide-react';
import type { IProject, IStatusConfig, IUserConfig } from '@/types';
import { useTranslations } from 'next-intl';

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

type PageState = 'loading' | 'success' | 'expired' | 'notFound' | 'error';

export default function SharedPage({ params }: SharedPageProps) {
  const t = useTranslations('sharedView');
  const [state, setState] = useState<PageState>('loading');
  const [project, setProject] = useState<IProject | null>(null);
  const [statuses, setStatuses] = useState<IStatusConfig[]>([]);
  const [users, setUsers] = useState<IUserConfig[]>([]);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [versionName, setVersionName] = useState<string | null>(null);
  const [mode, setMode] = useState<'snapshot' | 'live' | null>(null);

  useEffect(() => {
    async function loadSharedProject() {
      try {
        const { token: tokenParam } = await params;
        const response = await fetch(`/api/shared/${tokenParam}`);

        if (response.status === 404) {
          setState('notFound');
          return;
        }

        if (response.status === 410) {
          setState('expired');
          return;
        }

        if (!response.ok) {
          setState('error');
          return;
        }

        const data = await response.json();

        if (!data.project) {
          setState('notFound');
          return;
        }

        setProject(data.project as IProject);
        setStatuses(data.statuses ?? []);
        setUsers(data.users ?? []);
        setExpiresAt(new Date(data.expiresAt));
        setMode(data.mode ?? null);
        setVersionName(data.versionName ?? null);
        setState('success');
      } catch (err) {
        console.error('[SharedPage] Error loading shared project:', err);
        setState('error');
      }
    }

    loadSharedProject();
  }, [params]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (state === 'notFound') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('notFound')}</h1>
          <p className="text-muted-foreground">The project you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('expired')}</h1>
          <p className="text-muted-foreground">This shared link has expired.</p>
        </div>
      </div>
    );
  }

  if (state === 'error' || !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground">Failed to load the shared project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <GanttReadonlyBoard
        project={project}
        statuses={statuses}
        users={users}
        expiresAt={expiresAt}
        mode={mode}
        versionName={versionName}
      />
    </div>
  );
}

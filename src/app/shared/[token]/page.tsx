import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { connectDB } from '@/lib/mongodb';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sanitizeProjectForShare, filterUsersForProject } from '@/lib/shareUtils';
import Project from '@/lib/models/Project';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';
import SharedLink from '@/lib/models/SharedLink';
import Account from '@/lib/models/Account';
import { GanttReadonlyBoard } from '@/components/gantt/GanttReadonlyBoard';
import type { IStatusConfig, IUserConfig } from '@/types';

export const runtime = 'nodejs';

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedPage({ params }: SharedPageProps) {
  const t = await getTranslations('sharedView');
  const { token } = await params;

  // Rate limit by IP
  const hdrs = await headers();
  const clientIp = getClientIp(hdrs);
  const rateCheck = checkRateLimit(`shared:${clientIp}`, 30, 60_000);
  if (!rateCheck.ok) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('error')}</h1>
          <p className="text-muted-foreground">{t('tooManyRequests')}</p>
        </div>
      </div>
    );
  }

  await connectDB();

  const now = new Date();

  const share = await SharedLink.findOne({
    token,
    revokedAt: null,
  }).lean();

  if (!share) {
    notFound();
  }

  // Check expiration separately so we can show a distinct message
  if (share.expiresAt <= now) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('expired')}</h1>
          <p className="text-muted-foreground">{t('expiredDescription')}</p>
        </div>
      </div>
    );
  }

  let rawData: Record<string, unknown> | null = null;
  let versionName: string | undefined;

  if (share.mode === 'snapshot') {
    if (!share.snapshotId) notFound();
    const snapshot = await ProjectSnapshot.findOne({ _id: share.snapshotId }).lean();
    if (!snapshot) notFound();
    rawData = snapshot!.snapshotData as Record<string, unknown>;
    versionName = snapshot!.versionName;
  } else {
    const project = await Project.findOne({ _id: share.projectId }).lean();
    if (!project) notFound();
    rawData = project as unknown as Record<string, unknown>;
  }

  if (!rawData) notFound();

  // Serialize to plain objects (converts ObjectId → string, Date → ISO string)
  const projectData = JSON.parse(JSON.stringify(rawData)) as Record<string, unknown>;

  // Sanitize project: strip accountId, createdBy, comments, descriptions, etc.
  const sanitizedProject = sanitizeProjectForShare(projectData);

  // Fetch workspace settings
  const account = await Account.findById(share.accountId).select('settings').lean();
  const rawStatuses = account?.settings?.statuses ?? [];
  const rawUsers = account?.settings?.users ?? [];

  // Serialize to plain objects (converts ObjectId → string)
  const statuses: IStatusConfig[] = JSON.parse(JSON.stringify(rawStatuses));
  const allUsers: IUserConfig[] = JSON.parse(JSON.stringify(rawUsers));

  // Filter users to only those referenced in this project
  const users = filterUsersForProject(allUsers, sanitizedProject);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <GanttReadonlyBoard
        project={sanitizedProject}
        statuses={statuses}
        users={users}
        expiresAt={share.expiresAt.toISOString()}
        mode={share.mode as 'snapshot' | 'live'}
        versionName={versionName ?? null}
      />
    </div>
  );
}

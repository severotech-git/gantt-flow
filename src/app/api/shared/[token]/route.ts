import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import Project from '@/lib/models/Project';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';
import SharedLink from '@/lib/models/SharedLink';
import Account from '@/lib/models/Account';

export const runtime = 'nodejs';

// GET /api/shared/[token] – PUBLIC endpoint (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Rate limit by IP: 30 requests per minute
    const clientIp = getClientIp(req.headers);
    const rateCheck = checkRateLimit(`shared:${clientIp}`, 30, 60_000);
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    await connectDB();

    const now = new Date();

    // Find share: must not be revoked, must not be expired
    const share = await SharedLink.findOne({
      token,
      revokedAt: null,
      expiresAt: { $gt: now },
    }).lean();

    if (!share) {
      return NextResponse.json({ error: 'Share not found or expired' }, { status: 404 });
    }

    let projectData: Record<string, unknown> | null = null;
    let versionName: string | undefined;

    if (share.mode === 'snapshot') {
      // Load from the referenced snapshot
      if (!share.snapshotId) {
        return NextResponse.json({ error: 'Snapshot reference missing' }, { status: 500 });
      }
      const snapshot = await ProjectSnapshot.findOne({ _id: share.snapshotId }).lean();
      if (!snapshot) {
        return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
      }
      projectData = snapshot.snapshotData as Record<string, unknown>;
      versionName = snapshot.versionName;
    } else {
      // Live mode: fetch current project
      const project = await Project.findOne({ _id: share.projectId }).lean();
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      projectData = project as unknown as Record<string, unknown>;
    }

    if (!projectData) {
      return NextResponse.json({ error: 'Project data not available' }, { status: 404 });
    }

    // Fetch workspace settings (statuses + users) for proper rendering
    const account = await Account.findById(share.accountId).select('settings').lean();
    const statuses = account?.settings?.statuses ?? [];
    const users = account?.settings?.users ?? [];

    return NextResponse.json({
      mode: share.mode,
      project: projectData,
      expiresAt: share.expiresAt.toISOString(),
      statuses,
      users,
      ...(versionName ? { versionName } : {}),
    });
  } catch (err) {
    console.error('[GET /api/shared/[token]]', err);
    return NextResponse.json({ error: 'Failed to fetch shared project' }, { status: 500 });
  }
}

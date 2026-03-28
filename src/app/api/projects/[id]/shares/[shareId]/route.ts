import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireManage } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import SharedLink from '@/lib/models/SharedLink';

export const runtime = 'nodejs';

// GET /api/projects/[id]/shares/[shareId] – Get share URL (for copy link)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const authResult = await requireManage();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    const { id: projectId, shareId } = await params;

    await connectDB();

    const project = await Project.findOne({ _id: projectId, accountId }).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const share = await SharedLink.findOne(
      { _id: shareId, projectId, accountId, revokedAt: null },
      { token: 1 }
    ).lean();
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.json({ url: `${APP_URL}/shared/${share.token}` });
  } catch (err) {
    console.error('[GET /api/projects/[id]/shares/[shareId]]', err);
    return NextResponse.json({ error: 'Failed to get share' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/shares/[shareId] – Revoke a share
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const authResult = await requireManage();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    const { id: projectId, shareId } = await params;

    await connectDB();

    // Verify project exists and belongs to account
    const project = await Project.findOne({ _id: projectId, accountId }).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify share exists, belongs to this project/account, and is not already revoked
    const share = await SharedLink.findOne({
      _id: shareId,
      projectId,
      accountId,
    });
    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }
    if (share.revokedAt) {
      return NextResponse.json({ error: 'Share is already revoked' }, { status: 410 });
    }

    // Soft revoke by setting revokedAt (TTL will eventually clean it up)
    share.revokedAt = new Date();
    await share.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]/shares/[shareId]]', err);
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 });
  }
}

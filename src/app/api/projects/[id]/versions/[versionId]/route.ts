import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; versionId: string }> };

// GET /api/projects/[id]/versions/[versionId] – fetch full snapshot data
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id, versionId } = await params;

    // Verify user owns this project
    const project = await Project.findOne({ _id: id, createdBy: userId }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const snapshot = await ProjectSnapshot.findOne({
      _id: versionId,
      projectId: id,
    }).lean();

    if (!snapshot) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error('[GET /api/projects/[id]/versions/[versionId]]', err);
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/versions/[versionId] – restore snapshot as live project state
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id, versionId } = await params;

    // Verify user owns this project
    const project = await Project.findOne({ _id: id, createdBy: userId }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const snapshot = await ProjectSnapshot.findOne({ _id: versionId, projectId: id }).lean();
    if (!snapshot) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

    const data = snapshot.snapshotData as Record<string, unknown>;
    await Project.findByIdAndUpdate(id, { $set: { epics: data.epics ?? [] } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/projects/[id]/versions/[versionId]]', err);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/versions/[versionId] – permanently remove a snapshot
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id, versionId } = await params;

    // Verify user owns this project
    const project = await Project.findOne({ _id: id, createdBy: userId }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const result = await ProjectSnapshot.deleteOne({ _id: versionId, projectId: id });
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]/versions/[versionId]]', err);
    return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
  }
}

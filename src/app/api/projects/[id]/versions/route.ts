import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/versions – list all snapshots for this project
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id } = await params;

    // Verify user owns this project
    const project = await Project.findOne({ _id: id, createdBy: userId }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const snapshots = await ProjectSnapshot.find(
      { projectId: id },
      { snapshotData: 0 }  // exclude heavy payload from list view
    )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(snapshots);
  } catch (err) {
    console.error('[GET /api/projects/[id]/versions]', err);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

// POST /api/projects/[id]/versions – create a snapshot of the current project state
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    if (!body.versionName || typeof body.versionName !== 'string') {
      return NextResponse.json({ error: 'versionName is required' }, { status: 400 });
    }

    const project = await Project.findOne({ _id: id, createdBy: userId }).lean();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Create the snapshot (lean() returns a plain object, safe for Mixed field)
    const snapshot = await ProjectSnapshot.create({
      projectId: id,
      versionName: body.versionName.trim(),
      snapshotData: project as unknown as Record<string, unknown>,
    });

    // Bump the currentVersion label on the live project
    await Project.findByIdAndUpdate(id, {
      $set: { currentVersion: `${body.versionName} (Current)` },
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects/[id]/versions]', err);
    return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';

type Params = { params: Promise<{ id: string; versionId: string }> };

// GET /api/projects/[id]/versions/[versionId] – fetch full snapshot data
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id, versionId } = await params;

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

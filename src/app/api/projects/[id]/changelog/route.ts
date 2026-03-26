import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import ItemChangelog from '@/lib/models/ItemChangelog';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id]/changelog – fetch changelog entries for a specific item
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();
    const { id } = await params;

    // Verify project belongs to this account
    const project = await Project.findOne({ _id: id, accountId }, '_id').lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const epicId = searchParams.get('epicId');
    const featureId = searchParams.get('featureId');
    const taskId = searchParams.get('taskId');

    if (!epicId) return NextResponse.json({ error: 'epicId is required' }, { status: 400 });

    const query: Record<string, unknown> = { projectId: id, epicId };
    if (featureId) query.featureId = featureId;
    if (taskId) query.taskId = taskId;
    // When fetching a feature, exclude task-level entries
    if (featureId && !taskId) query.taskId = { $exists: false };
    // When fetching an epic, exclude feature/task entries
    if (!featureId && !taskId) {
      query.featureId = { $exists: false };
      query.taskId = { $exists: false };
    }

    const entries = await ItemChangelog.find(query)
      .sort({ changedAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(entries);
  } catch (err) {
    console.error('[GET /api/projects/[id]/changelog]', err);
    return NextResponse.json({ error: 'Failed to fetch changelog' }, { status: 500 });
  }
}

// POST /api/projects/[id]/changelog – write a changelog entry
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId, userId } = authResult;

    await connectDB();
    const { id } = await params;

    // Verify project belongs to this account
    const project = await Project.findOne({ _id: id, accountId }, '_id').lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const { epicId, featureId, taskId, field, oldValue, newValue } = body;

    if (!epicId || typeof epicId !== 'string') {
      return NextResponse.json({ error: 'epicId is required' }, { status: 400 });
    }
    if (!field || typeof field !== 'string') {
      return NextResponse.json({ error: 'field is required' }, { status: 400 });
    }

    const entry = await ItemChangelog.create({
      projectId: id,
      epicId,
      featureId: featureId || undefined,
      taskId: taskId || undefined,
      field,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: newValue != null ? String(newValue) : null,
      userId,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects/[id]/changelog]', err);
    return NextResponse.json({ error: 'Failed to write changelog entry' }, { status: 500 });
  }
}

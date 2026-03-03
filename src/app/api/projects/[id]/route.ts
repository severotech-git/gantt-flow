import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id] – fetch full project with epics
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();
    const { id } = await params;
    const project = await Project.findOne({ _id: id, accountId }).lean();
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    console.error('[GET /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PATCH /api/projects/[id] – update project (name, description, color, epics, currentVersion)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const allowedFields = ['name', 'description', 'color', 'currentVersion', 'archived', 'epics'];
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        if (key === 'epics' && Array.isArray(body[key])) {
          update[key] = cleanTmpIds(body[key] as unknown[]);
        } else {
          update[key] = body[key];
        }
      }
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, accountId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (err) {
    console.error('[PATCH /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

/** Recursively removes _id fields that start with 'tmp_'. Max depth: 10 (epic→feature→task tree). */
function cleanTmpIds(obj: unknown, depth = 0): unknown {
  if (depth > 10) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanTmpIds(item, depth + 1));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      const val = (obj as Record<string, unknown>)[key];
      if (key === '_id' && typeof val === 'string' && val.startsWith('tmp_')) {
        continue;
      }
      newObj[key] = cleanTmpIds(val, depth + 1);
    }
    return newObj;
  }
  return obj;
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();
    const { id } = await params;
    const project = await Project.findOneAndDelete({ _id: id, accountId });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

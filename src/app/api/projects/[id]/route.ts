import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/[id] – fetch full project with epics
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const project = await Project.findById(id).lean();
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
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const allowedFields = ['name', 'description', 'color', 'currentVersion', 'epics'];
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        if (key === 'epics' && Array.isArray(body[key])) {
          update[key] = cleanTmpIds(body[key]);
        } else {
          update[key] = body[key];
        }
      }
    }

    const project = await Project.findByIdAndUpdate(
      id,
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

/** Recursively removes _id fields that start with 'tmp_' */
function cleanTmpIds(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanTmpIds);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (key === '_id' && typeof obj[key] === 'string' && obj[key].startsWith('tmp_')) {
        continue;
      }
      newObj[key] = cleanTmpIds(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// DELETE /api/projects/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id } = await params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

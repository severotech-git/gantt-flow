import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';

export const runtime = 'nodejs';

// GET /api/projects – list projects for the active account (lightweight, no epics)
// ?archived=true returns only archived; default returns only active
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();
    const archived = new URL(req.url).searchParams.get('archived') === 'true';
    const projects = await Project.find({ accountId, archived }, { epics: 0 }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(projects);
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects – create a new project in the active account
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (body.name.trim().length > 255) {
      return NextResponse.json({ error: 'name must be 255 characters or fewer' }, { status: 400 });
    }
    if (body.description && typeof body.description === 'string' && body.description.length > 5000) {
      return NextResponse.json({ error: 'description must be 5000 characters or fewer' }, { status: 400 });
    }

    const project = await Project.create({
      name: body.name.trim(),
      description: body.description ?? '',
      color: body.color ?? '#6366f1',
      currentVersion: 'Live',
      accountId,
      createdBy: userId,
      epics: [],
    });

    return NextResponse.json(project.toObject(), { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

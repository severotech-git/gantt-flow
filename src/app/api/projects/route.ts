import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/lib/models/Project';

// GET /api/projects – list all projects (lightweight, no epics)
export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find({}, { epics: 0 }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(projects);
  } catch (err) {
    console.error('[GET /api/projects]', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects – create a new project
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const project = await Project.create({
      name: body.name.trim(),
      description: body.description ?? '',
      color: body.color ?? '#6366f1',
      currentVersion: 'v1 (Current)',
      epics: [],
    });

    return NextResponse.json(project.toObject(), { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects]', err);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

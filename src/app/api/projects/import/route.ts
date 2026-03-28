import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import Account from '@/lib/models/Account';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

const MAX_TOTAL_ITEMS = 2000;

function assignIds(obj: Record<string, unknown>): void {
  if (!obj._id) obj._id = new mongoose.Types.ObjectId();
  if (Array.isArray(obj.features)) {
    for (const f of obj.features as Record<string, unknown>[]) {
      assignIds(f);
      if (Array.isArray(f.tasks)) {
        for (const t of f.tasks as Record<string, unknown>[]) {
          if (!t._id) t._id = new mongoose.Types.ObjectId();
        }
      }
    }
  }
}

// POST /api/projects/import – create a project with a full Epic→Feature→Task tree
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
    if (!Array.isArray(body.epics) || body.epics.length === 0) {
      return NextResponse.json({ error: 'epics array is required and must not be empty' }, { status: 400 });
    }

    // Count total items across all levels
    let totalItems = body.epics.length;
    for (const epic of body.epics) {
      const features = Array.isArray(epic.features) ? epic.features : [];
      totalItems += features.length;
      for (const feature of features) {
        totalItems += Array.isArray(feature.tasks) ? feature.tasks.length : 0;
      }
    }
    if (totalItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        { error: `Import exceeds the ${MAX_TOTAL_ITEMS}-item limit. Reduce the file size and try again.`, code: 'IMPORT_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Assign proper ObjectIds to all items
    const epics = body.epics as Record<string, unknown>[];
    for (const epic of epics) assignIds(epic);

    const [project] = await Promise.all([
      Project.create({
        name: body.name.trim(),
        description: body.description ?? '',
        color: body.color ?? '#6366f1',
        currentVersion: 'Live',
        accountId,
        createdBy: userId,
        epics,
      }),
      Account.updateOne({ _id: accountId, onboardingComplete: { $ne: true } }, { $set: { onboardingComplete: true } }),
    ]);

    return NextResponse.json(project.toObject(), { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects/import]', err);
    return NextResponse.json({ error: 'Failed to import project' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import WorkspaceSettings from '@/lib/models/WorkspaceSettings';
import { seedWorkspaceForNewUser } from '@/lib/seedWorkspace';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    let doc = await WorkspaceSettings.findOne({ userId }).lean();
    if (!doc) {
      // Auto-seed for users created before the seeding flow existed
      await seedWorkspaceForNewUser(userId, 'User');
      doc = await WorkspaceSettings.findOne({ userId }).lean();
    }
    return NextResponse.json(doc);
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();
    const body = await request.json();

    const allowed = ['users', 'theme', 'levelNames', 'statuses', 'allowWeekends'] as const;
    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) $set[key] = body[key];
    }

    const doc = await WorkspaceSettings.findOneAndUpdate(
      { userId },
      { $set },
      { new: true, upsert: true, runValidators: false }
    ).lean();

    return NextResponse.json(doc);
  } catch (err) {
    console.error('[settings PATCH]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

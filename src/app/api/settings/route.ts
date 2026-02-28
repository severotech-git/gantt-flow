import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import WorkspaceSettings from '@/lib/models/WorkspaceSettings';

export async function GET() {
  try {
    await connectDB();
    const doc = await WorkspaceSettings.findOneAndUpdate(
      {},
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return NextResponse.json(doc);
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const allowed = ['users', 'theme', 'levelNames', 'statuses'] as const;
    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) $set[key] = body[key];
    }

    const doc = await WorkspaceSettings.findOneAndUpdate(
      {},
      { $set },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: false }
    ).lean();

    return NextResponse.json(doc);
  } catch (err) {
    console.error('[settings PATCH]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

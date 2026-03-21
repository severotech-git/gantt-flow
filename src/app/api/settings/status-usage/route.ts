import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireManage } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireManage();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    await connectDB();

    const projects = await Project.find(
      { accountId, archived: false },
      { 'epics.status': 1, 'epics.features.status': 1, 'epics.features.tasks.status': 1 }
    ).lean();

    const counts: Record<string, number> = {};

    for (const project of projects) {
      for (const epic of (project as unknown as { epics: Array<{ status: string; features: Array<{ status: string; tasks: Array<{ status: string }> }> }> }).epics || []) {
        counts[epic.status] = (counts[epic.status] || 0) + 1;
        for (const feature of epic.features || []) {
          counts[feature.status] = (counts[feature.status] || 0) + 1;
          for (const task of feature.tasks || []) {
            counts[task.status] = (counts[task.status] || 0) + 1;
          }
        }
      }
    }

    return NextResponse.json(counts);
  } catch (err) {
    console.error('[status-usage GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

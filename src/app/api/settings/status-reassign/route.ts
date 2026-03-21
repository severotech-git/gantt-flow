import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireManage } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import Account from '@/lib/models/Account';
import { SYSTEM_STATUS_VALUES } from '@/lib/statusConstants';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authResult = await requireManage();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    const { fromStatus, toStatus } = await request.json();

    if (!fromStatus || !toStatus || typeof fromStatus !== 'string' || typeof toStatus !== 'string') {
      return NextResponse.json({ error: 'fromStatus and toStatus are required' }, { status: 400 });
    }

    if (fromStatus === toStatus) {
      return NextResponse.json({ error: 'fromStatus and toStatus must be different' }, { status: 400 });
    }

    if (SYSTEM_STATUS_VALUES.has(fromStatus)) {
      return NextResponse.json({ error: 'Cannot reassign a system status' }, { status: 400 });
    }

    await connectDB();

    // Verify toStatus exists in the account's configured statuses
    const account = await Account.findById(accountId).select('settings.statuses').lean();
    const validValues = (account?.settings?.statuses ?? []).map((s: { value: string }) => s.value);
    if (!validValues.includes(toStatus)) {
      return NextResponse.json({ error: 'Target status does not exist' }, { status: 400 });
    }

    // Update epic-level statuses
    const epicResult = await Project.updateMany(
      { accountId, 'epics.status': fromStatus },
      { $set: { 'epics.$[elem].status': toStatus } },
      { arrayFilters: [{ 'elem.status': fromStatus }] }
    );

    // Update feature-level statuses
    const featureResult = await Project.updateMany(
      { accountId, 'epics.features.status': fromStatus },
      { $set: { 'epics.$[].features.$[feat].status': toStatus } },
      { arrayFilters: [{ 'feat.status': fromStatus }] }
    );

    // Update task-level statuses
    const taskResult = await Project.updateMany(
      { accountId, 'epics.features.tasks.status': fromStatus },
      { $set: { 'epics.$[].features.$[].tasks.$[task].status': toStatus } },
      { arrayFilters: [{ 'task.status': fromStatus }] }
    );

    const updatedCount =
      (epicResult.modifiedCount || 0) +
      (featureResult.modifiedCount || 0) +
      (taskResult.modifiedCount || 0);

    return NextResponse.json({ updatedCount });
  } catch (err) {
    console.error('[status-reassign POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

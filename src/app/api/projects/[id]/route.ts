import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import Account from '@/lib/models/Account';
import { createNotifications } from '@/lib/notifications';

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
    const { accountId, userId } = authResult;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Field-level validation
    if ('name' in body && (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 255)) {
      return NextResponse.json({ error: 'name must be a non-empty string of 255 characters or fewer' }, { status: 400 });
    }
    if ('description' in body && body.description !== null && typeof body.description !== 'string') {
      return NextResponse.json({ error: 'description must be a string' }, { status: 400 });
    }
    if ('description' in body && typeof body.description === 'string' && body.description.length > 5000) {
      return NextResponse.json({ error: 'description must be 5000 characters or fewer' }, { status: 400 });
    }
    if ('color' in body && body.color !== null && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json({ error: 'color must be a valid 6-digit hex color (e.g. #ff0000)' }, { status: 400 });
    }

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

    // Snapshot previous epics if we need to detect item-level changes
    const needsDiff = 'epics' in body && Array.isArray(body.epics);
    const previousProject = needsDiff
      ? await Project.findOne({ _id: id, accountId }, { epics: 1, name: 1 }).lean()
      : null;

    const project = await Project.findOneAndUpdate(
      { _id: id, accountId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Detect assignment and status changes, fire notifications asynchronously
    if (previousProject && needsDiff) {
      fireItemChangeNotifications({
        projectId: id,
        projectName: (project as any).name,
        actorUserId: userId,
        previousEpics: (previousProject as any).epics ?? [],
        nextEpics: (project as any).epics ?? [],
        accountId,
      }).catch((err) => console.error('[item change notifications error]', err));
    }

    return NextResponse.json(project);
  } catch (err) {
    console.error('[PATCH /api/projects/[id]]', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

interface ItemChangeParams {
  projectId: string;
  projectName: string;
  actorUserId: string;
  previousEpics: any[];
  nextEpics: any[];
  accountId: string;
}

async function fireItemChangeNotifications(params: ItemChangeParams) {
  const { projectId, projectName, actorUserId, previousEpics, nextEpics, accountId } = params;

  // Get actor name from workspace settings
  const account = await Account.findById(accountId, { 'settings.users': 1 }).lean();
  const workspaceUsers = (account as any)?.settings?.users ?? [];
  const actorUser = workspaceUsers.find((u: any) => u.uid === actorUserId);
  const actorName = actorUser?.name ?? 'Someone';

  // Build a flat map of previous items by _id for quick lookup
  const prevItemMap = new Map<string, { ownerId?: string; status?: string; name: string; createdBy?: string }>();
  for (const epic of previousEpics) {
    prevItemMap.set(epic._id?.toString(), { ownerId: epic.ownerId, status: epic.status, name: epic.name, createdBy: epic.createdBy });
    for (const feature of epic.features ?? []) {
      prevItemMap.set(feature._id?.toString(), { ownerId: feature.ownerId, status: feature.status, name: feature.name, createdBy: feature.createdBy });
      for (const task of feature.tasks ?? []) {
        prevItemMap.set(task._id?.toString(), { ownerId: task.ownerId, status: task.status, name: task.name, createdBy: task.createdBy });
      }
    }
  }

  // Walk next items and detect ownerId / status changes
  for (const epic of nextEpics) {
    await checkItemChanges({ item: epic, epicId: epic._id?.toString(), projectId, projectName, actorUserId, actorName, prevItemMap });
    for (const feature of epic.features ?? []) {
      await checkItemChanges({ item: feature, epicId: epic._id?.toString(), featureId: feature._id?.toString(), projectId, projectName, actorUserId, actorName, prevItemMap });
      for (const task of feature.tasks ?? []) {
        await checkItemChanges({ item: task, epicId: epic._id?.toString(), featureId: feature._id?.toString(), taskId: task._id?.toString(), projectId, projectName, actorUserId, actorName, prevItemMap });
      }
    }
  }
}

interface CheckItemParams {
  item: any;
  epicId: string;
  featureId?: string;
  taskId?: string;
  projectId: string;
  projectName: string;
  actorUserId: string;
  actorName: string;
  prevItemMap: Map<string, { ownerId?: string; status?: string; name: string; createdBy?: string }>;
}

async function checkItemChanges(p: CheckItemParams) {
  const { item, epicId, featureId, taskId, projectId, projectName, actorUserId, actorName, prevItemMap } = p;
  const itemId = (taskId ?? featureId ?? epicId)?.toString();
  const prev = prevItemMap.get(itemId);
  if (!prev) return;

  const notifications: Array<() => Promise<void>> = [];

  // Owner changed → notify new owner under 'itemsOwned'
  if (item.ownerId && item.ownerId !== prev.ownerId && item.ownerId !== actorUserId) {
    notifications.push(() =>
      createNotifications({
        type: 'assignment',
        projectId,
        projectName,
        itemPath: { epicId, featureId, taskId },
        itemName: item.name,
        actorUserId,
        actorName,
        message: `${actorName} assigned you to "${item.name}" in project "${projectName}"`,
        recipients: [{ userId: item.ownerId, category: 'itemsOwned' }],
      })
    );
  }

  // Status changed → notify owner and creator under their respective categories
  if (item.status && item.status !== prev.status) {
    const recipients: Array<{ userId: string; category: 'itemsCreated' | 'itemsOwned' | 'mentions' }> = [];
    if (item.ownerId && item.ownerId !== actorUserId) {
      recipients.push({ userId: item.ownerId, category: 'itemsOwned' });
    }
    if (item.createdBy && item.createdBy !== actorUserId && item.createdBy !== item.ownerId) {
      recipients.push({ userId: item.createdBy, category: 'itemsCreated' });
    }
    if (recipients.length > 0) {
      notifications.push(() =>
        createNotifications({
          type: 'status-change',
          projectId,
          projectName,
          itemPath: { epicId, featureId, taskId },
          itemName: item.name,
          actorUserId,
          actorName,
          message: `${actorName} changed the status of "${item.name}" to "${item.status}" in project "${projectName}"`,
          recipients,
        })
      );
    }
  }

  await Promise.all(notifications.map((fn) => fn()));
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

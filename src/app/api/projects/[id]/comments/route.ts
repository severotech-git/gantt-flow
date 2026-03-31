import { NextResponse, NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Project from '@/lib/models/Project';
import Account from '@/lib/models/Account';
import { createNotifications } from '@/lib/notifications';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

interface CommentPayload {
  epicId: string;
  featureId?: string;
  taskId?: string;
  text: string;
  authorId: string;
  mentionedUserIds?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    const body: CommentPayload = await request.json();

    // Validation
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (body.text.trim().length === 0 || body.text.trim().length > 5000) {
      return NextResponse.json(
        { error: 'text must be between 1 and 5000 characters' },
        { status: 400 }
      );
    }
    if (!body.epicId) {
      return NextResponse.json({ error: 'epicId is required' }, { status: 400 });
    }
    if (!body.authorId) {
      return NextResponse.json({ error: 'authorId is required' }, { status: 400 });
    }

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    await connectDB();

    // Fetch project and verify account ownership
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.accountId.toString() !== accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Find the item to add comment to
    const epicDoc = project.epics.id(body.epicId) as any;
    if (!epicDoc) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 });
    }

    let target: any = epicDoc;
    if (body.featureId) {
      const feature = epicDoc.features?.id(body.featureId);
      if (!feature) {
        return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
      }
      if (body.taskId) {
        const task = feature.tasks?.id(body.taskId);
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        target = task;
      } else {
        target = feature;
      }
    }

    // Create comment
    const comment = {
      _id: randomBytes(12).toString('hex'),
      authorId: body.authorId,
      text: body.text.trim(),
      mentionedUserIds: body.mentionedUserIds ?? [],
      createdAt: new Date(),
    };

    if (!target.comments) {
      target.comments = [];
    }
    target.comments.push(comment);

    // Save project
    await project.save();

    // Trigger notifications asynchronously — don't block the response
    (async () => {
      try {
        // Get actor name from workspace settings
        const account = await Account.findById(accountId, { 'settings.users': 1 }).lean();
        const workspaceUsers = (account as any)?.settings?.users ?? [];
        const actorUser = workspaceUsers.find((u: any) => u.uid === userId);
        const actorName = actorUser?.name ?? 'Someone';

        // Build recipient list
        const recipients: Array<{ userId: string; category: 'itemsCreated' | 'itemsOwned' | 'mentions' }> = [];

        // Item owner gets notified under 'itemsOwned'
        if (target.ownerId && target.ownerId !== userId) {
          recipients.push({ userId: target.ownerId, category: 'itemsOwned' });
        }

        // Item creator gets notified under 'itemsCreated'
        const itemCreatedBy = target.createdBy ?? epicDoc.createdBy;
        if (itemCreatedBy && itemCreatedBy !== userId && itemCreatedBy !== target.ownerId) {
          recipients.push({ userId: itemCreatedBy, category: 'itemsCreated' });
        }

        // Mentioned users get notified under 'mentions'
        for (const mentionedId of body.mentionedUserIds ?? []) {
          if (mentionedId !== userId) {
            recipients.push({ userId: mentionedId, category: 'mentions' });
          }
        }

        if (recipients.length > 0) {
          const notifType = (body.mentionedUserIds?.length ?? 0) > 0 ? 'mention' : 'comment';
          await createNotifications({
            type: notifType,
            projectId: id,
            projectName: project.name,
            itemPath: { epicId: body.epicId, featureId: body.featureId, taskId: body.taskId },
            itemName: target.name,
            actorUserId: userId,
            actorName,
            message: `${actorName} commented on "${target.name}" in project "${project.name}"`,
            recipients,
          });
        }
      } catch (err) {
        console.error('[comments notification error]', err);
      }
    })();

    return NextResponse.json(comment);
  } catch (err) {
    console.error('[projects [id] comments POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

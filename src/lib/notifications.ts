import mongoose from 'mongoose';
import User from '@/lib/models/User';
import Notification from '@/lib/models/Notification';
import { getIO } from '@/lib/socketServer';
import { sendNotificationEmail } from '@/lib/email';
import type { INotification, NotificationChannel } from '@/types/index';

export interface CreateNotificationParams {
  type: 'comment' | 'mention' | 'status-change' | 'assignment' | 'item-update';
  projectId: string;
  projectName: string;
  itemPath: {
    epicId: string;
    featureId?: string;
    taskId?: string;
  };
  itemName: string;
  epicName: string;
  featureName?: string;
  level: 'epic' | 'feature' | 'task';
  actorUserId: string;
  actorName: string;
  message: string;
  recipients: Array<{ userId: string; category: 'itemsCreated' | 'itemsOwned' | 'mentions' } | null>;
}

export async function createNotifications(params: CreateNotificationParams) {
  try {
    // Deduplicate and filter out null/actor recipients
    const uniqueRecipients = new Map<string, 'itemsCreated' | 'itemsOwned' | 'mentions'>();
    for (const r of params.recipients) {
      if (r && r.userId && r.userId !== params.actorUserId) {
        // For duplicate user IDs, keep the first category (arbitrary priority)
        if (!uniqueRecipients.has(r.userId)) {
          uniqueRecipients.set(r.userId, r.category);
        }
      }
    }

    if (uniqueRecipients.size === 0) return;

    // Fetch all recipient preferences in one query
    const recipientIds = Array.from(uniqueRecipients.keys()).map((id) => new mongoose.Types.ObjectId(id));
    const users = await User.find(
      { _id: { $in: recipientIds } },
      { notificationPreferences: 1, email: 1, locale: 1 }
    ).lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const io = getIO();

    // Prepare notifications and emails
    const notificationsToCreate: Omit<INotification, '_id'>[] = [];
    const emailsToSend: Array<{ to: string; locale: string; notification: Omit<INotification, '_id'> }> = [];

    for (const [recipientId, category] of uniqueRecipients) {
      const user = userMap.get(recipientId);
      if (!user) continue;

      const prefs = user.notificationPreferences ?? { itemsCreated: 'both', itemsOwned: 'both', mentions: 'both' };
      const channel: NotificationChannel = prefs[category] ?? 'both';

      // Skip if turned off
      if (channel === 'off') continue;

      const notification: Omit<INotification, '_id'> = {
        recipientUserId: recipientId,
        type: params.type,
        projectId: params.projectId,
        projectName: params.projectName,
        itemPath: params.itemPath,
        itemName: params.itemName,
        epicName: params.epicName,
        featureName: params.featureName,
        level: params.level,
        actorUserId: params.actorUserId,
        actorName: params.actorName,
        message: params.message,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // In-app notification
      if (channel === 'in-app' || channel === 'both') {
        notificationsToCreate.push(notification);
      }

      // Email notification
      if (channel === 'email' || channel === 'both') {
        emailsToSend.push({
          to: user.email,
          locale: user.locale ?? 'en',
          notification,
        });
      }
    }

    // Batch create notifications and emit socket events with real IDs
    if (notificationsToCreate.length > 0) {
      const created = await Notification.insertMany(notificationsToCreate);
      if (io) {
        // Batch all socket events — collect per-user, then emit once per user
        const userEvents = new Map<string, unknown[]>();
        for (const doc of created) {
          const key = `user:${doc.recipientUserId}`;
          if (!userEvents.has(key)) userEvents.set(key, []);
          userEvents.get(key)!.push({
            _id: doc._id.toString(),
            recipientUserId: doc.recipientUserId,
            type: doc.type,
            projectId: doc.projectId,
            projectName: doc.projectName,
            itemPath: doc.itemPath,
            itemName: doc.itemName,
            epicName: doc.epicName,
            featureName: doc.featureName,
            level: doc.level,
            actorUserId: doc.actorUserId,
            actorName: doc.actorName,
            message: doc.message,
            read: doc.read,
            createdAt: new Date(doc.createdAt).toISOString(),
          });
        }
        for (const [room, events] of userEvents) {
          io.to(room).emit('notification', events);
        }
      }
    }

    // Send emails asynchronously (don't wait for them)
    if (emailsToSend.length > 0) {
      sendEmailNotifications(emailsToSend).catch((err) => {
        console.error('[sendEmailNotifications error]', err);
      });
    }
  } catch (err) {
    console.error('[createNotifications error]', err);
  }
}

async function sendEmailNotifications(
  emails: Array<{ to: string; locale: string; notification: Omit<INotification, '_id'> }>
) {
  await Promise.all(
    emails.map(async (email) => {
      try {
        await sendNotificationEmail(email.to, email.locale as 'en' | 'pt-BR' | 'es', {
          actorName: email.notification.actorName,
          projectName: email.notification.projectName,
          itemName: email.notification.itemName,
          actionDescription: getActionDescription(email.notification.type),
          itemUrl: `${process.env.NEXTAUTH_URL}/projects/${email.notification.projectId}?open=${[email.notification.itemPath.epicId, email.notification.itemPath.featureId, email.notification.itemPath.taskId].filter(Boolean).join(',')}`,
        });
      } catch (err) {
        console.error(`[sendNotificationEmail to ${email.to}]`, err);
      }
    })
  );
}

function getActionDescription(type: string): string {
  const descriptions: Record<string, string> = {
    comment: 'commented on',
    mention: 'mentioned you in',
    'status-change': 'changed the status of',
    assignment: 'assigned you to',
    'item-update': 'updated',
  };
  return descriptions[type] || 'updated';
}

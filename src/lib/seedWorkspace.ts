import { connectDB } from './mongodb';
import Account, { DEFAULT_STATUSES } from './models/Account';
import User from './models/User';
import { IUserConfig } from '@/types';

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function colorFromUserId(userId: string): string {
  const hue = hashStringToNumber(userId) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Creates an Account (with owner + embedded settings),
 * and sets mainAccountId on the User.
 * Idempotent: skips if the user already has a mainAccountId.
 */
export async function seedAccountForNewUser(userId: string, userName: string): Promise<void> {
  try {
    await connectDB();

    const existingUser = await User.findById(userId);
    if (existingUser?.mainAccountId) return;

    const accountName = `${userName}'s Workspace`;
    let slug = slugify(accountName) || 'workspace';
    const existing = await Account.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const userColor = colorFromUserId(userId);
    const firstUser: IUserConfig = { uid: userId, name: userName || 'You', color: userColor };

    const account = await Account.create({
      name: accountName,
      slug,
      plan: 'trial',
      trialEndsAt,
      status: 'active',
      createdBy: userId,
      members: [{ userId, role: 'owner', joinedAt: new Date() }],
      settings: {
        users: [firstUser],
        statuses: DEFAULT_STATUSES,
        levelNames: { epic: 'Epic', feature: 'Feature', task: 'Task' },
        allowWeekends: false,
      },
    });

    await User.findByIdAndUpdate(userId, { mainAccountId: account._id.toString() });
  } catch (error) {
    console.error(`Failed to seed account for user ${userId}:`, error);
    throw error;
  }
}

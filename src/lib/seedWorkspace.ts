import WorkspaceSettings, { DEFAULT_STATUSES } from './models/WorkspaceSettings';
import { IUserConfig } from '@/types';

/**
 * Hash a string to a number for consistent color generation
 */
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic color from a userId
 */
function colorFromUserId(userId: string): string {
  const hue = hashStringToNumber(userId) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Idempotent workspace seeding on first login
 */
export async function seedWorkspaceForNewUser(userId: string, userName: string): Promise<void> {
  try {
    const existing = await WorkspaceSettings.findOne({ userId });
    if (existing) {
      return;
    }

    const userColor = colorFromUserId(userId);
    const firstUser: IUserConfig = {
      uid: userId,
      name: userName || 'You',
      color: userColor,
    };

    await WorkspaceSettings.create({
      userId,
      users: [firstUser],
      theme: 'system',
      statuses: DEFAULT_STATUSES,
      levelNames: { epic: 'Epic', feature: 'Feature', task: 'Task' },
      allowWeekends: false,
    });
  } catch (error) {
    console.error(`Failed to seed workspace for user ${userId}:`, error);
    throw error;
  }
}

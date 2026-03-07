import { connectDB } from '@/lib/mongodb';
import Account from '@/lib/models/Account';
import Subscription from '@/lib/models/Subscription';
import Plan from '@/lib/models/Plan';
import type { ISubscriptionDocument } from '@/lib/models/Subscription';
import type { IPlanDocument } from '@/lib/models/Plan';

export async function getAccountSubscription(
  accountId: string
): Promise<(ISubscriptionDocument & { plan?: IPlanDocument }) | null> {
  await connectDB();
  const sub = await Subscription.findOne({
    accountId,
    status: { $in: ['active', 'past_due', 'unpaid', 'incomplete'] },
  }).lean() as (ISubscriptionDocument & { plan?: IPlanDocument }) | null;

  if (!sub) return null;

  const plan = await Plan.findById(sub.planId).lean() as IPlanDocument | null;
  if (plan) sub.plan = plan;

  return sub;
}

export async function getMaxMembers(accountId: string): Promise<number> {
  const sub = await getAccountSubscription(accountId);
  if (sub?.plan) return sub.plan.maxMembers;
  return 5; // trial default
}

export async function canAddMember(
  accountId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  await connectDB();
  const [account, max] = await Promise.all([
    Account.findById(accountId, { members: 1 }).lean(),
    getMaxMembers(accountId),
  ]);
  const current = account?.members?.length ?? 0;
  return { allowed: current < max, current, max };
}

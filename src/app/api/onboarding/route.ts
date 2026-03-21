import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import Project from '@/lib/models/Project';
import { generateSampleProject, IndustryKey } from '@/lib/onboardingTemplates';
import { AppLocale, SUPPORTED_LOCALES } from '@/types';

export const runtime = 'nodejs';

const VALID_INDUSTRIES: IndustryKey[] = ['software', 'marketing', 'construction', 'education', 'events', 'product', 'other'];

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId } = authResult;

    await connectDB();

    // Idempotency: skip if already completed
    const account = await Account.findById(accountId, { onboardingComplete: 1 }).lean();
    if (account?.onboardingComplete) {
      return NextResponse.json({ ok: true, alreadyComplete: true });
    }

    const body = await request.json();

    // Validate industry
    const industry: IndustryKey = VALID_INDUSTRIES.includes(body.industry) ? body.industry : 'other';

    // Get user locale from session
    const { auth } = await import('@/auth');
    const session = await auth();
    const sessionLocale = session?.user?.locale;
    const locale: AppLocale = sessionLocale && SUPPORTED_LOCALES.includes(sessionLocale as AppLocale)
      ? (sessionLocale as AppLocale)
      : 'en';

    // Generate and create the sample project
    const projectData = generateSampleProject({
      industry,
      locale,
      userId,
    });

    const project = await Project.create({
      ...projectData,
      accountId,
      createdBy: userId,
      archived: false,
    });

    // Mark onboarding as complete
    await Account.findByIdAndUpdate(accountId, { $set: { onboardingComplete: true } });

    return NextResponse.json({ _id: project._id.toString(), name: project.name }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/onboarding]', err);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}

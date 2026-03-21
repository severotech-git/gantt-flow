import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Account from '@/lib/models/Account';
import Project from '@/lib/models/Project';
import { generateSampleProject, IndustryKey } from '@/lib/onboardingTemplates';
import { AppLocale, SUPPORTED_LOCALES } from '@/types';

export const runtime = 'nodejs';

const VALID_INDUSTRIES: IndustryKey[] = ['software', 'marketing', 'construction', 'education', 'events', 'product', 'other'];
const VALID_TEAM_SIZES = ['solo', 'small', 'medium', 'large'];
const VALID_USE_CASES  = ['project-tracking', 'sprint-planning', 'roadmap', 'campaign', 'general'];

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId, locale: sessionLocale } = authResult;

    await connectDB();

    const body = await request.json();

    // Validate and normalise inputs
    const industry: IndustryKey = VALID_INDUSTRIES.includes(body.industry) ? body.industry : 'other';
    const teamSize: string = VALID_TEAM_SIZES.includes(body.teamSize) ? body.teamSize : 'solo';
    const useCase:  string = VALID_USE_CASES.includes(body.useCase)   ? body.useCase  : 'general';
    const locale: AppLocale = SUPPORTED_LOCALES.includes(sessionLocale as AppLocale)
      ? (sessionLocale as AppLocale)
      : 'en';

    // Atomically claim the onboarding slot and persist the answers.
    // findOneAndUpdate returns null when no document matched (already complete or not found).
    const claimed = await Account.findOneAndUpdate(
      { _id: accountId, onboardingComplete: { $ne: true } },
      { $set: { onboardingComplete: true, onboardingAnswers: { industry, teamSize, useCase } } },
      { new: false, projection: { _id: 1 } }
    ).lean();

    if (!claimed) {
      return NextResponse.json({ ok: true, alreadyComplete: true });
    }

    // Generate and create the sample project
    const projectData = generateSampleProject({ industry, locale, userId });

    const project = await Project.create({
      ...projectData,
      accountId,
      createdBy: userId,
      archived: false,
    });

    return NextResponse.json({ _id: project._id.toString(), name: project.name }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/onboarding]', err);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}

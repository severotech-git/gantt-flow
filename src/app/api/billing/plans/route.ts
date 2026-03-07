import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Plan from '@/lib/models/Plan';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await connectDB();

    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    return NextResponse.json(plans);
  } catch (err) {
    console.error('[GET /api/billing/plans]', err);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

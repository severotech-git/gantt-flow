import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Notification from '@/lib/models/Notification';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();

    const count = await Notification.countDocuments({
      recipientUserId: userId,
      read: false,
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error('[notifications unread-count GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

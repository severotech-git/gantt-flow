import { NextResponse, NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import Notification from '@/lib/models/Notification';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    await connectDB();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '0', 10);
    const readFilter = url.searchParams.get('read'); // 'true', 'false', or null for all

    const query: Record<string, unknown> = { recipientUserId: userId };
    if (readFilter !== null) {
      query.read = readFilter === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return NextResponse.json({
      notifications,
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: (page + 1) * PAGE_SIZE < total,
    });
  } catch (err) {
    console.error('[notifications GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const body = await request.json();

    await connectDB();

    // Mark all notifications as read for this user
    if (body.markAllRead === true) {
      await Notification.updateMany(
        { recipientUserId: userId, read: false },
        { $set: { read: true } }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err) {
    console.error('[notifications PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

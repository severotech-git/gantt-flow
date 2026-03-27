import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { requireAuth } from '@/lib/apiAuth';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendShareLinkEmails } from '@/lib/email';
import Project from '@/lib/models/Project';
import ProjectSnapshot from '@/lib/models/ProjectSnapshot';
import SharedLink from '@/lib/models/SharedLink';

export const runtime = 'nodejs';

const EXPIRATION_PRESETS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// POST /api/projects/[id]/shares – Create share link + send emails
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, accountId, locale } = authResult;

    const { id: projectId } = await params;

    // Rate limit: 10 shares per minute per user
    const rateLimitKey = `share:${userId}`;
    const rateCheck = checkRateLimit(rateLimitKey, 10, 60_000);
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: 'Too many share requests', code: 'TOO_MANY_SHARES' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    await connectDB();

    const body = await req.json();

    // Validate request body
    if (!body.mode || !['snapshot', 'live'].includes(body.mode)) {
      return NextResponse.json({ error: 'mode must be "snapshot" or "live"' }, { status: 400 });
    }
    if (!Array.isArray(body.emails)) {
      return NextResponse.json({ error: 'emails must be an array' }, { status: 400 });
    }
    if (!body.expiresIn || !Object.keys(EXPIRATION_PRESETS).includes(body.expiresIn)) {
      return NextResponse.json(
        { error: 'expiresIn must be one of: 1h, 24h, 7d, 30d' },
        { status: 400 }
      );
    }

    // For snapshot mode, snapshotId is required
    if (body.mode === 'snapshot' && !body.snapshotId) {
      return NextResponse.json(
        { error: 'snapshotId is required for snapshot mode' },
        { status: 400 }
      );
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of body.emails as unknown[]) {
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json({ error: `Invalid email: ${email}` }, { status: 400 });
      }
    }

    // Verify project exists and belongs to account
    const project = await Project.findOne({ _id: projectId, accountId }).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // For snapshot mode, verify the snapshot exists and belongs to this project
    if (body.mode === 'snapshot') {
      const snapshot = await ProjectSnapshot.findOne(
        { _id: body.snapshotId, projectId },
        { _id: 1 }
      ).lean();
      if (!snapshot) {
        return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
      }
    }

    // Generate token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = new Date(Date.now() + EXPIRATION_PRESETS[body.expiresIn]);

    // Create SharedLink document
    const sharedLink = await SharedLink.create({
      token,
      projectId,
      accountId,
      mode: body.mode,
      ...(body.mode === 'snapshot' ? { snapshotId: body.snapshotId } : {}),
      expiresAt,
      emails: body.emails,
      createdBy: userId,
    });

    // Generate share URL
    const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${APP_URL}/shared/${token}`;

    // Send emails in batch (only if recipients were provided)
    if (body.emails.length > 0) {
      try {
        await sendShareLinkEmails(
          body.emails,
          project.name,
          userId,
          shareUrl,
          expiresAt,
          locale
        );
      } catch (emailErr) {
        console.error('[POST /api/projects/[id]/shares] Email send failed:', emailErr);
      }
    }

    return NextResponse.json(
      {
        _id: sharedLink._id,
        token,
        url: shareUrl,
        expiresAt: expiresAt.toISOString(),
        mode: body.mode,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/projects/[id]/shares]', err);
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 });
  }
}

// GET /api/projects/[id]/shares – List active shares for project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { accountId } = authResult;

    const { id: projectId } = await params;

    await connectDB();

    // Verify project exists and belongs to account
    const project = await Project.findOne({ _id: projectId, accountId }).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // List active (not revoked and not expired) shares
    const now = new Date();
    const shares = await SharedLink.find(
      {
        projectId,
        accountId,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      { token: 0 } // Don't expose the token in list view
    )
      .populate('snapshotId', 'versionName')
      .sort({ createdAt: -1 })
      .lean();

    // Flatten snapshotId into snapshotName for easier consumption
    const result = shares.map((s) => {
      const snap = s.snapshotId as unknown as { _id: string; versionName: string } | null;
      return {
        ...s,
        snapshotId: snap?._id ?? undefined,
        snapshotName: snap?.versionName ?? undefined,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/projects/[id]/shares]', err);
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
  }
}

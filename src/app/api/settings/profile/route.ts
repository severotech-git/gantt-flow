import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import WorkspaceSettings from '@/lib/models/WorkspaceSettings';
import { requireAuth } from '@/lib/apiAuth';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    const { name } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    await connectDB();

    // 1. Update User model
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Update name in WorkspaceSettings (used for displaying user in various places)
    await WorkspaceSettings.updateOne(
      { userId, 'users.uid': userId },
      { $set: { 'users.$.name': name.trim() } }
    );

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
      }
    });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

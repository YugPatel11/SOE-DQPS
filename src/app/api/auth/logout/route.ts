import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, clearAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user?.sessionId) {
      // Invalidate session in database
      await prisma.session.updateMany({
        where: { userId: user.userId, isActive: true },
        data: { isActive: false },
      });
    }

    // Clear cookies
    await clearAuthCookies();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if DB update fails
    await clearAuthCookies();
    return NextResponse.json({
      success: true,
      message: 'Logged out',
    });
  }
}

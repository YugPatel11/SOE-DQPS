import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Dashboard overview stats
    const [
      totalStudents,
      totalPapers,
      totalAssignments,
      activeSessions,
      totalViolations,
      recentViolations,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.paper.count(),
      prisma.assignment.count(),
      prisma.session.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      prisma.violationLog.count(),
      prisma.violationLog.count({
        where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalPapers,
        totalAssignments,
        activeSessions,
        totalViolations,
        recentViolations,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

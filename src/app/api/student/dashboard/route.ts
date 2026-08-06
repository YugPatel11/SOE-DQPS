import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get student's assigned papers
    const assignments = await prisma.assignment.findMany({
      where: { studentId: user.userId },
      include: {
        paper: {
          select: {
            id: true,
            paperCode: true,
            paperName: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Check daily view limit
    const student = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { dailyViewCount: true, lastViewDate: true, name: true, rollNo: true },
    });

    const today = new Date().toISOString().split('T')[0];
    const lastView = student?.lastViewDate?.toISOString().split('T')[0];
    const currentDailyViews = lastView === today ? (student?.dailyViewCount || 0) : 0;
    const canView = currentDailyViews < 2; // Max 2 papers per day

    return NextResponse.json({
      success: true,
      data: {
        student: {
          name: student?.name,
          rollNo: student?.rollNo,
        },
        papers: assignments.map((a) => ({
          id: a.paper.id,
          paperCode: a.paper.paperCode,
          paperName: a.paper.paperName,
          assignedAt: a.assignedAt.toISOString(),
          canView,
        })),
        dailyViewsUsed: currentDailyViews,
        dailyViewLimit: 2,
      },
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

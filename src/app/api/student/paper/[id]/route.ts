import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, getClientIp, getUserAgent } from '@/lib/auth';
import { getSignedPdfUrl } from '@/lib/cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: paperId } = await params;

    // Verify student has this paper assigned (SERVER-SIDE authorization)
    const assignment = await prisma.assignment.findFirst({
      where: {
        studentId: user.userId,
        paperId,
      },
      include: {
        paper: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this paper' },
        { status: 403 }
      );
    }

    // Check daily view limit
    const student = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { dailyViewCount: true, lastViewDate: true, name: true, rollNo: true },
    });

    const today = new Date().toISOString().split('T')[0];
    const lastView = student?.lastViewDate?.toISOString().split('T')[0];
    let currentDailyViews = lastView === today ? (student?.dailyViewCount || 0) : 0;

    if (currentDailyViews >= 2) {
      return NextResponse.json(
        { success: false, error: 'Daily view limit reached. You can view up to 2 papers per day.' },
        { status: 429 }
      );
    }

    // Update daily view count
    currentDailyViews++;
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        dailyViewCount: lastView === today ? { increment: 1 } : 1,
        lastViewDate: new Date(),
      },
    });

    // Generate signed URL (expires in 5 minutes)
    const signedUrl = getSignedPdfUrl(assignment.paper.publicId);

    // Log access
    const ip = getClientIp(request);
    const ua = getUserAgent(request);

    await prisma.accessLog.create({
      data: {
        studentId: user.userId,
        paperId,
        action: 'VIEW',
        ipAddress: ip,
        userAgent: ua,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: signedUrl,
        paperCode: assignment.paper.paperCode,
        paperName: assignment.paper.paperName,
        student: {
          name: student?.name || '',
          rollNo: student?.rollNo || '',
        },
        dailyViewsUsed: currentDailyViews,
        dailyViewLimit: 2,
      },
    });
  } catch (error) {
    console.error('Paper view error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

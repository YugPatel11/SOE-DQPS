import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { violationSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = violationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid violation data' },
        { status: 400 }
      );
    }

    const { paperId, violationType, metadata } = validation.data;

    // Verify student has access to this paper
    const assignment = await prisma.assignment.findFirst({
      where: { studentId: user.userId, paperId },
    });

    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Invalid paper' }, { status: 400 });
    }

    // Log violation
    await prisma.violationLog.create({
      data: {
        studentId: user.userId,
        paperId,
        violationType,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Violation logged' });
  } catch (error) {
    console.error('Violation report error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

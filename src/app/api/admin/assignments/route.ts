import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { email: { contains: search, mode: 'insensitive' } } },
        { student: { rollNo: { contains: search, mode: 'insensitive' } } },
        { paper: { paperCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true, rollNo: true } },
          paper: { select: { id: true, paperCode: true, paperName: true } },
        },
        orderBy: { assignedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: assignments.map((a) => ({
        id: a.id,
        student: a.student,
        paper: a.paper,
        assignedAt: a.assignedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

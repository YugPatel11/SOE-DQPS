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
    const status = searchParams.get('status'); // 'active' | 'disabled' | null

    const where: Record<string, unknown> = { role: 'STUDENT' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { rollNo: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') where.isActive = true;
    if (status === 'disabled') where.isActive = false;

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              assignments: true,
              violationLogs: true,
            },
          },
          accessLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            select: { timestamp: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        rollNo: s.rollNo,
        department: s.department,
        semester: s.semester,
        isActive: s.isActive,
        createdAt: s.createdAt.toISOString(),
        assignmentCount: s._count.assignments,
        violationCount: s._count.violationLogs,
        lastAccess: s.accessLogs[0]?.timestamp?.toISOString() || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

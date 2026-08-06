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
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all'; // 'access' | 'violation' | 'all'
    const studentId = searchParams.get('studentId');
    const paperId = searchParams.get('paperId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const timeFilter: Record<string, unknown> = {};
    if (from) timeFilter.gte = new Date(from);
    if (to) timeFilter.lte = new Date(to);

    const results: Array<Record<string, unknown>> = [];
    let total = 0;

    if (type === 'access' || type === 'all') {
      const accessWhere: Record<string, unknown> = {};
      if (studentId) accessWhere.studentId = studentId;
      if (paperId) accessWhere.paperId = paperId;
      if (from || to) accessWhere.timestamp = timeFilter;

      const [accessLogs, accessCount] = await Promise.all([
        prisma.accessLog.findMany({
          where: accessWhere,
          include: {
            student: { select: { id: true, name: true, email: true, rollNo: true } },
            paper: { select: { id: true, paperCode: true, paperName: true } },
          },
          orderBy: { timestamp: 'desc' },
          skip: type === 'all' ? 0 : (page - 1) * limit,
          take: type === 'all' ? Math.floor(limit / 2) : limit,
        }),
        prisma.accessLog.count({ where: accessWhere }),
      ]);

      results.push(
        ...accessLogs.map((log) => ({
          id: log.id,
          type: 'access',
          student: log.student,
          paper: log.paper,
          action: log.action,
          duration: log.duration,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp.toISOString(),
        }))
      );

      total += accessCount;
    }

    if (type === 'violation' || type === 'all') {
      const violationWhere: Record<string, unknown> = {};
      if (studentId) violationWhere.studentId = studentId;
      if (paperId) violationWhere.paperId = paperId;
      if (from || to) violationWhere.timestamp = timeFilter;

      const [violationLogs, violationCount] = await Promise.all([
        prisma.violationLog.findMany({
          where: violationWhere,
          include: {
            student: { select: { id: true, name: true, email: true, rollNo: true } },
            paper: { select: { id: true, paperCode: true, paperName: true } },
          },
          orderBy: { timestamp: 'desc' },
          skip: type === 'all' ? 0 : (page - 1) * limit,
          take: type === 'all' ? Math.floor(limit / 2) : limit,
        }),
        prisma.violationLog.count({ where: violationWhere }),
      ]);

      results.push(
        ...violationLogs.map((log) => ({
          id: log.id,
          type: 'violation',
          student: log.student,
          paper: log.paper,
          violationType: log.violationType,
          metadata: log.metadata,
          timestamp: log.timestamp.toISOString(),
        }))
      );

      total += violationCount;
    }

    // Sort combined results by timestamp
    results.sort((a, b) =>
      new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
    );

    return NextResponse.json({
      success: true,
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

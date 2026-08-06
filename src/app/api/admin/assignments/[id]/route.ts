import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    await prisma.assignment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Assignment revoked successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to revoke assignment' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const student = await prisma.user.findUnique({ where: { id, role: 'STUDENT' } });
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.name) updateData.name = body.name;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.semester !== undefined) updateData.semester = body.semester;

    // If disabling student, also invalidate their sessions
    if (body.isActive === false) {
      await prisma.session.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: body.isActive === false ? 'Student disabled successfully' : 'Student updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 });
  }
}

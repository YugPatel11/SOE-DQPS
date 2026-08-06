import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { deletePdf } from '@/lib/cloudinary';

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

    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return NextResponse.json({ success: false, error: 'Paper not found' }, { status: 404 });
    }

    // Delete from Cloudinary
    await deletePdf(paper.publicId);

    // Delete from database (cascades to assignments)
    await prisma.paper.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Paper deleted successfully' });
  } catch (error) {
    console.error('Delete paper error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete paper' }, { status: 500 });
  }
}

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

    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return NextResponse.json({ success: false, error: 'Paper not found' }, { status: 404 });
    }

    const updated = await prisma.paper.update({
      where: { id },
      data: {
        paperName: body.paperName !== undefined ? body.paperName : paper.paperName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        paperCode: updated.paperCode,
        paperName: updated.paperName,
      },
    });
  } catch (error) {
    console.error('Update paper error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update paper' }, { status: 500 });
  }
}

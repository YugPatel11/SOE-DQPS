import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { uploadPdf } from '@/lib/cloudinary';
import { paperUploadSchema } from '@/lib/validators';

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

    const where = search
      ? {
          OR: [
            { paperCode: { contains: search, mode: 'insensitive' as const } },
            { paperName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        include: {
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paper.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: papers.map((p) => ({
        id: p.id,
        paperCode: p.paperCode,
        paperName: p.paperName,
        fileUrl: p.fileUrl,
        createdAt: p.createdAt.toISOString(),
        assignmentCount: p._count.assignments,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get papers error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const paperCode = formData.get('paperCode') as string;
    const paperName = formData.get('paperName') as string | null;

    // Validate metadata
    const metaValidation = paperUploadSchema.safeParse({ paperCode, paperName: paperName || undefined });
    if (!metaValidation.success) {
      return NextResponse.json(
        { success: false, error: metaValidation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'No PDF file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ success: false, error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // File size limit (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 50MB.' }, { status: 400 });
    }

    // Check if paper code already exists
    const existing = await prisma.paper.findUnique({
      where: { paperCode: metaValidation.data.paperCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Paper with code "${metaValidation.data.paperCode}" already exists` },
        { status: 409 }
      );
    }

    // Upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await uploadPdf(buffer, metaValidation.data.paperCode);

    // Save to database
    const paper = await prisma.paper.create({
      data: {
        paperCode: metaValidation.data.paperCode,
        paperName: metaValidation.data.paperName || null,
        fileUrl: uploadResult.url,
        publicId: uploadResult.publicId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Paper uploaded successfully',
      data: {
        id: paper.id,
        paperCode: paper.paperCode,
        paperName: paper.paperName,
        createdAt: paper.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload paper error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload paper' }, { status: 500 });
  }
}

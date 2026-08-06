import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseAssignmentExcel } from '@/lib/excel';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload an Excel file.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = await parseAssignmentExcel(buffer);

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed.',
        data: { imported: 0, updated: 0, skipped: 0, errors: parseResult.errors, totalRows: parseResult.totalRows },
      }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [...parseResult.errors];

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      try {
        // Find student by roll number or email
        const student = await prisma.user.findFirst({
          where: {
            OR: [
              { rollNo: row.rollNoOrEmail },
              { email: row.rollNoOrEmail.toLowerCase() },
            ],
            role: 'STUDENT',
          },
        });

        if (!student) {
          errors.push({
            row: i + 2,
            column: 'rollNoOrEmail',
            message: `Student not found: ${row.rollNoOrEmail}`,
            value: row.rollNoOrEmail,
          });
          skipped++;
          continue;
        }

        // Find paper by code
        const paper = await prisma.paper.findUnique({
          where: { paperCode: row.paperCode },
        });

        if (!paper) {
          errors.push({
            row: i + 2,
            column: 'paperCode',
            message: `Paper not found: ${row.paperCode}. Make sure to upload the paper PDF first.`,
            value: row.paperCode,
          });
          skipped++;
          continue;
        }

        // Upsert assignment
        const existing = await prisma.assignment.findUnique({
          where: {
            studentId_paperId: {
              studentId: student.id,
              paperId: paper.id,
            },
          },
        });

        if (existing) {
          updated++;
        } else {
          await prisma.assignment.create({
            data: {
              studentId: student.id,
              paperId: paper.id,
            },
          });
          imported++;
        }
      } catch (dbError) {
        console.error(`Error processing assignment row: ${row.rollNoOrEmail} → ${row.paperCode}`, dbError);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Assignment upload complete. ${imported} new, ${updated} existing, ${skipped} skipped.`,
      data: { imported, updated, skipped, errors, totalRows: parseResult.totalRows },
    });
  } catch (error) {
    console.error('Upload assignments error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process Excel file' }, { status: 500 });
  }
}

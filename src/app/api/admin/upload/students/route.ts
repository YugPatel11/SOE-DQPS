import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseStudentExcel } from '@/lib/excel';
import { Role } from '@prisma/client';

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

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' }, { status: 400 });
    }

    // File size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = await parseStudentExcel(buffer);

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed. See errors below.',
        data: {
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: parseResult.errors,
          totalRows: parseResult.totalRows,
        },
      }, { status: 400 });
    }

    // Upsert students
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of parseResult.data) {
      try {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { email: row.email.toLowerCase() },
              { rollNo: row.rollNo },
            ],
          },
        });

        if (existing) {
          // Update existing
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              email: row.email.toLowerCase(),
              rollNo: row.rollNo,
              department: row.department || existing.department,
              semester: row.semester || existing.semester,
              role: Role.STUDENT,
            },
          });
          updated++;
        } else {
          // Create new
          await prisma.user.create({
            data: {
              name: row.name,
              email: row.email.toLowerCase(),
              rollNo: row.rollNo,
              department: row.department,
              semester: row.semester,
              role: Role.STUDENT,
              isActive: true,
            },
          });
          imported++;
        }
      } catch (dbError) {
        console.error(`Error processing student row: ${row.rollNo}`, dbError);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Student upload complete. ${imported} imported, ${updated} updated, ${skipped} skipped.`,
      data: {
        imported,
        updated,
        skipped,
        errors: parseResult.errors,
        totalRows: parseResult.totalRows,
      },
    });
  } catch (error) {
    console.error('Upload students error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process Excel file' }, { status: 500 });
  }
}

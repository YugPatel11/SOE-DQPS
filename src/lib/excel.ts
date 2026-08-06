import ExcelJS from 'exceljs';
import { studentRowSchema, assignmentRowSchema } from './validators';

export interface ExcelValidationError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

export interface StudentRow {
  rollNo: string;
  name: string;
  email: string;
  department?: string;
  semester?: string;
}

export interface AssignmentRow {
  rollNoOrEmail: string;
  paperCode: string;
  paperName?: string;
}

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: ExcelValidationError[];
  totalRows: number;
}

/**
 * Parse Student List Excel
 * Expected columns: Roll No, Full Name, University Email, Department (optional), Semester (optional)
 */
export async function parseStudentExcel(buffer: Buffer): Promise<ParseResult<StudentRow>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    return { success: false, data: [], errors: [{ row: 0, column: '', message: 'No worksheet found in the Excel file' }], totalRows: 0 };
  }

  const errors: ExcelValidationError[] = [];
  const data: StudentRow[] = [];

  // Validate headers
  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values as string[];
  const headerMap = new Map<string, number>();

  // Flexible header matching
  for (let i = 1; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase().trim();
    if (header.includes('roll') || header.includes('student id') || header.includes('enrollment')) {
      headerMap.set('rollNo', i);
    } else if (header.includes('name') && !header.includes('paper')) {
      headerMap.set('name', i);
    } else if (header.includes('email')) {
      headerMap.set('email', i);
    } else if (header.includes('department') || header.includes('dept') || header.includes('branch')) {
      headerMap.set('department', i);
    } else if (header.includes('semester') || header.includes('sem')) {
      headerMap.set('semester', i);
    }
  }

  // Check required headers
  const requiredHeaders = ['rollNo', 'name', 'email'];
  for (const rh of requiredHeaders) {
    if (!headerMap.has(rh)) {
      errors.push({ row: 1, column: rh, message: `Required column "${rh}" not found. Expected columns: Roll No, Full Name, University Email` });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, totalRows: 0 };
  }

  const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'youruniversity.edu.in';
  let totalRows = 0;

  // Parse data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    totalRows++;

    const rollNo = String(row.getCell(headerMap.get('rollNo')!).value || '').trim();
    const name = String(row.getCell(headerMap.get('name')!).value || '').trim();
    const rawEmail = row.getCell(headerMap.get('email')!).value;
    const email = typeof rawEmail === 'object' && rawEmail !== null && 'text' in rawEmail
      ? String((rawEmail as { text: string }).text).trim().toLowerCase()
      : String(rawEmail || '').trim().toLowerCase();
    const department = headerMap.has('department')
      ? String(row.getCell(headerMap.get('department')!).value || '').trim() || undefined
      : undefined;
    const semester = headerMap.has('semester')
      ? String(row.getCell(headerMap.get('semester')!).value || '').trim() || undefined
      : undefined;

    // Validate using Zod
    const result = studentRowSchema.safeParse({ rollNo, name, email, department, semester });
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNumber,
          column: issue.path.join('.'),
          message: issue.message,
          value: String(issue.path[0] === 'rollNo' ? rollNo : issue.path[0] === 'name' ? name : email),
        });
      }
      return;
    }

    // Check email domain
    if (!email.endsWith(`@${domain}`)) {
      errors.push({
        row: rowNumber,
        column: 'email',
        message: `Email must end with @${domain}`,
        value: email,
      });
      return;
    }

    data.push(result.data);
  });

  return {
    success: errors.length === 0,
    data,
    errors,
    totalRows,
  };
}

/**
 * Parse Paper Assignment Excel
 * Expected columns: Roll No / Email, Paper Code, Paper Name (optional)
 */
export async function parseAssignmentExcel(buffer: Buffer): Promise<ParseResult<AssignmentRow>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    return { success: false, data: [], errors: [{ row: 0, column: '', message: 'No worksheet found in the Excel file' }], totalRows: 0 };
  }

  const errors: ExcelValidationError[] = [];
  const data: AssignmentRow[] = [];

  // Validate headers
  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values as string[];
  const headerMap = new Map<string, number>();

  for (let i = 1; i < headers.length; i++) {
    const header = String(headers[i] || '').toLowerCase().trim();
    if (header.includes('roll') || header.includes('student') || header.includes('email') || header.includes('enrollment')) {
      if (!headerMap.has('rollNoOrEmail')) headerMap.set('rollNoOrEmail', i);
    } else if (header.includes('paper code') || header.includes('code') || header.includes('subject code')) {
      headerMap.set('paperCode', i);
    } else if (header.includes('paper name') || header.includes('subject name') || header.includes('paper title')) {
      headerMap.set('paperName', i);
    }
  }

  const requiredHeaders = ['rollNoOrEmail', 'paperCode'];
  for (const rh of requiredHeaders) {
    if (!headerMap.has(rh)) {
      errors.push({ row: 1, column: rh, message: `Required column "${rh}" not found. Expected columns: Roll No / Email, Paper Code` });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, totalRows: 0 };
  }

  let totalRows = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;

    const rollNoOrEmail = String(row.getCell(headerMap.get('rollNoOrEmail')!).value || '').trim();
    const paperCode = String(row.getCell(headerMap.get('paperCode')!).value || '').trim();
    const paperName = headerMap.has('paperName')
      ? String(row.getCell(headerMap.get('paperName')!).value || '').trim() || undefined
      : undefined;

    const result = assignmentRowSchema.safeParse({ rollNoOrEmail, paperCode, paperName });
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          row: rowNumber,
          column: issue.path.join('.'),
          message: issue.message,
          value: String(issue.path[0] === 'rollNoOrEmail' ? rollNoOrEmail : paperCode),
        });
      }
      return;
    }

    data.push(result.data);
  });

  return {
    success: errors.length === 0,
    data,
    errors,
    totalRows,
  };
}

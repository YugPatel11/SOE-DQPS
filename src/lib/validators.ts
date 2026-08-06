import { z } from 'zod';

// Email domain validation
export const emailDomainSchema = z.string().email('Invalid email address').refine(
  (email) => {
    const domain = process.env.ALLOWED_EMAIL_DOMAIN || 'youruniversity.edu.in';
    return email.endsWith(`@${domain}`);
  },
  { message: 'Email must belong to the university domain' }
);

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// OTP verification schema
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

// Paper upload schema
export const paperUploadSchema = z.object({
  paperCode: z.string().min(1, 'Paper code is required').max(50, 'Paper code too long'),
  paperName: z.string().max(200, 'Paper name too long').optional(),
});

// Student update schema
export const studentUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(200).optional(),
  department: z.string().max(100).optional(),
  semester: z.string().max(20).optional(),
});

// Assignment schema
export const assignmentSchema = z.object({
  studentId: z.string().cuid('Invalid student ID'),
  paperId: z.string().cuid('Invalid paper ID'),
});

// Violation report schema
export const violationSchema = z.object({
  paperId: z.string().cuid('Invalid paper ID'),
  violationType: z.enum([
    'DEVTOOLS_OPEN',
    'TAB_SWITCH',
    'FULLSCREEN_EXIT',
    'PRINT_ATTEMPT',
    'COPY_ATTEMPT',
    'RIGHT_CLICK',
    'SHORTCUT_BLOCKED',
    'WINDOW_BLUR',
  ]),
  metadata: z.string().optional(),
});

// Excel row schemas for validation
export const studentRowSchema = z.object({
  rollNo: z.string().min(1, 'Roll No is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  department: z.string().optional(),
  semester: z.string().optional(),
});

export const assignmentRowSchema = z.object({
  rollNoOrEmail: z.string().min(1, 'Roll No or Email is required'),
  paperCode: z.string().min(1, 'Paper Code is required'),
  paperName: z.string().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Log filter schema
export const logFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  studentId: z.string().optional(),
  paperId: z.string().optional(),
  type: z.enum(['access', 'violation', 'all']).default('all'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

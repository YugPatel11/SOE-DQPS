export type UserRole = 'SUPERADMIN' | 'STUDENT';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  rollNo: string | null;
  department: string | null;
  semester: string | null;
  isActive: boolean;
  createdAt: string;
  assignmentCount?: number;
  violationCount?: number;
  lastAccess?: string | null;
}

export interface PaperInfo {
  id: string;
  paperCode: string;
  paperName: string | null;
  fileUrl: string;
  createdAt: string;
  assignmentCount?: number;
}

export interface AssignmentInfo {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    rollNo: string | null;
  };
  paper: {
    id: string;
    paperCode: string;
    paperName: string | null;
  };
  assignedAt: string;
}

export interface LogEntry {
  id: string;
  type: 'access' | 'violation';
  student: {
    id: string;
    name: string;
    email: string;
    rollNo: string | null;
  };
  paper: {
    id: string;
    paperCode: string;
    paperName: string | null;
  };
  action?: string;
  violationType?: string;
  duration?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  timestamp: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalPapers: number;
  totalAssignments: number;
  activeSessions: number;
  totalViolations: number;
  recentViolations: number;
}

export interface StudentDashboardPaper {
  id: string;
  paperCode: string;
  paperName: string | null;
  assignedAt: string;
  canView: boolean;
}

export interface ExcelUploadResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
    value?: string;
  }>;
}

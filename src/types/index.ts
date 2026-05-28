// Central TypeScript Interfaces

export interface Student {
  id: string;
  full_name: string;
  email: string;
  roll_number: string;
  class_name: string;
  created_at?: string;
}

export type AttendanceStatus = 'Present' | 'Absent';

export interface Attendance {
  id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  created_at?: string;
}

// Joined Query Structures
export interface AttendanceRecord extends Attendance {
  students?: Student;
}

// Reusable UI Stats & Analytics Types
export interface DashboardMetrics {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendancePercentage: number;
}

export interface WeeklyAttendanceData {
  date: string; // E.g., "Mon", "Tue"
  Present: number;
  Absent: number;
}

export interface MonthlyAttendanceData {
  month: string; // E.g., "Jan", "Feb"
  rate: number;  // E.g., 94.5 (percentage)
}

export interface ClassAttendanceSummary {
  class_name: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface StudentAttendanceStats {
  student: Student;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

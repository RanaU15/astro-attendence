import { supabase } from '../lib/supabase';
import type { Student, Attendance, AttendanceStatus, DashboardMetrics, WeeklyAttendanceData, MonthlyAttendanceData, ClassAttendanceSummary, StudentAttendanceStats } from '../types';

// ============================================================================
// STUDENT MANAGEMENT CRUD
// ============================================================================

/**
 * Fetches all students from the database, ordered by full name.
 */
export async function getAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
  return data || [];
}

/**
 * Adds a new student record.
 */
export async function addStudent(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert([student])
    .select()
    .single();

  if (error) {
    console.error('Error adding student:', error);
    throw error;
  }
  return data;
}

/**
 * Updates an existing student record.
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }
  return data;
}

/**
 * Deletes a student record (will cascade delete their attendance records).
 */
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
}

// ============================================================================
// ATTENDANCE TRACKING OPERATIONS
// ============================================================================

/**
 * Retrieves the attendance records for a specific date and class.
 * Returns a list of students joined with their attendance status (if marked).
 */
export async function getAttendanceByDateAndClass(
  dateStr: string,
  className: string
): Promise<{ student: Student; attendanceId: string | null; status: AttendanceStatus | null }[]> {
  // 1. Get all students in the specified class
  let studentQuery = supabase.from('students').select('*');
  if (className && className !== 'All') {
    studentQuery = studentQuery.eq('class_name', className);
  }
  const { data: students, error: studentError } = await studentQuery.order('full_name', { ascending: true });

  if (studentError) throw studentError;
  if (!students || students.length === 0) return [];

  // 2. Fetch all attendance marked for these students on the given date
  const studentIds = students.map((s) => s.id);
  const { data: attendanceList, error: attError } = await supabase
    .from('attendance')
    .select('*')
    .eq('attendance_date', dateStr)
    .in('student_id', studentIds);

  if (attError) throw attError;

  // 3. Map students to their attendance status
  const attendanceMap = new Map<string, Attendance>();
  attendanceList?.forEach((record) => {
    attendanceMap.set(record.student_id, record);
  });

  return students.map((student) => {
    const record = attendanceMap.get(student.id);
    return {
      student,
      attendanceId: record?.id || null,
      status: record?.status || null,
    };
  });
}

/**
 * Saves a list of attendance records (Present / Absent) to the database.
 * Uses bulk upsert to either create new records or overwrite existing records for the same day.
 */
export async function saveAttendanceBatch(
  records: Omit<Attendance, 'id' | 'created_at'>[]
): Promise<void> {
  if (records.length === 0) return;

  const { error } = await supabase
    .from('attendance')
    .upsert(records, {
      onConflict: 'student_id,attendance_date',
    });

  if (error) {
    console.error('Error saving attendance batch:', error);
    throw error;
  }
}

// ============================================================================
// DASHBOARD METRICS & ANALYTICS
// ============================================================================

/**
 * Fetches dashboard card metric statistics.
 */
export async function getDashboardMetrics(dateStr: string): Promise<DashboardMetrics> {
  // 1. Get total students count
  const { count: totalStudents, error: studentErr } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  if (studentErr) throw studentErr;

  // 2. Get attendance counts for today
  const { data: attendanceToday, error: attErr } = await supabase
    .from('attendance')
    .select('status')
    .eq('attendance_date', dateStr);

  if (attErr) throw attErr;

  let presentToday = 0;
  let absentToday = 0;

  attendanceToday?.forEach((r) => {
    if (r.status === 'Present') presentToday++;
    if (r.status === 'Absent') absentToday++;
  });

  const totalStudentsVal = totalStudents || 0;
  const markedToday = presentToday + absentToday;
  
  // Calculate attendance percentage. If no attendance marked today, base it on history or return 100%
  const attendancePercentage = markedToday > 0 
    ? Math.round((presentToday / markedToday) * 100)
    : 100;

  return {
    totalStudents: totalStudentsVal,
    presentToday,
    absentToday,
    attendancePercentage,
  };
}

/**
 * Generates daily attendance stats for the last 5 active school days.
 */
export async function getWeeklyAttendanceTrend(endDateStr: string): Promise<WeeklyAttendanceData[]> {
  const { data: attendanceData, error } = await supabase
    .from('attendance')
    .select('attendance_date, status')
    .order('attendance_date', { ascending: false })
    .limit(200); // Retrieve recent records

  if (error) throw error;

  // Group by date
  const dateGroups = new Map<string, { present: number; absent: number }>();
  
  attendanceData?.forEach((record) => {
    const date = record.attendance_date;
    const current = dateGroups.get(date) || { present: 0, absent: 0 };
    if (record.status === 'Present') current.present++;
    else current.absent++;
    dateGroups.set(date, current);
  });

  // Sort dates ascending
  const sortedDates = Array.from(dateGroups.keys()).sort().slice(-5); // Get last 5 days

  return sortedDates.map((date) => {
    const stats = dateGroups.get(date)!;
    // Format date from YYYY-MM-DD to readable format like "May 28"
    const parsedDate = new Date(date);
    const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
    return {
      date: dayName,
      Present: stats.present,
      Absent: stats.absent,
    };
  });
}

/**
 * Fetches attendance rates grouped by Class.
 */
export async function getClassSummaryReport(dateStr: string): Promise<ClassAttendanceSummary[]> {
  // 1. Get all students
  const { data: students, error: studentErr } = await supabase.from('students').select('*');
  if (studentErr) throw studentErr;

  // 2. Get today's attendance
  const { data: attendance, error: attErr } = await supabase
    .from('attendance')
    .select('*')
    .eq('attendance_date', dateStr);
  if (attErr) throw attErr;

  // Map attendance status by student ID
  const attendanceMap = new Map<string, string>();
  attendance?.forEach((r) => {
    attendanceMap.set(r.student_id, r.status);
  });

  // Group students by class
  const classGroups = new Map<string, { total: number; present: number; absent: number }>();
  students?.forEach((s) => {
    const current = classGroups.get(s.class_name) || { total: 0, present: 0, absent: 0 };
    current.total++;
    
    const status = attendanceMap.get(s.id);
    if (status === 'Present') current.present++;
    else if (status === 'Absent') current.absent++;
    
    classGroups.set(s.class_name, current);
  });

  return Array.from(classGroups.entries()).map(([class_name, stats]) => {
    const marked = stats.present + stats.absent;
    const percentage = marked > 0 ? Math.round((stats.present / marked) * 100) : 100;
    return {
      class_name,
      total: stats.total,
      present: stats.present,
      absent: stats.absent,
      percentage,
    };
  });
}

/**
 * Computes individual analytics for all students inside a specific class.
 */
export async function getStudentWiseAttendanceReport(
  className: string
): Promise<StudentAttendanceStats[]> {
  // 1. Get all students in this class
  let studentQuery = supabase.from('students').select('*');
  if (className && className !== 'All') {
    studentQuery = studentQuery.eq('class_name', className);
  }
  const { data: students, error: studentErr } = await studentQuery;
  if (studentErr) throw studentErr;
  if (!students || students.length === 0) return [];

  // 2. Fetch all attendance history for these student IDs
  const studentIds = students.map((s) => s.id);
  const { data: attendanceHistory, error: attErr } = await supabase
    .from('attendance')
    .select('student_id, status')
    .in('student_id', studentIds);

  if (attErr) throw attErr;

  // Map attendance by student id
  const studentAttMap = new Map<string, { total: number; present: number; absent: number }>();
  attendanceHistory?.forEach((r) => {
    const current = studentAttMap.get(r.student_id) || { total: 0, present: 0, absent: 0 };
    current.total++;
    if (r.status === 'Present') current.present++;
    else current.absent++;
    studentAttMap.set(r.student_id, current);
  });

  return students.map((student) => {
    const stats = studentAttMap.get(student.id) || { total: 0, present: 0, absent: 0 };
    const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 100;
    return {
      student,
      totalDays: stats.total,
      presentDays: stats.present,
      absentDays: stats.absent,
      percentage,
    };
  });
}

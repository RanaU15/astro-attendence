import { supabase } from '../lib/supabase';
import type { AttendanceLog, Employee } from '../types';
import { getAllEmployees } from './employeeService';

/**
 * Interface representing AttendanceLog joined with Employee
 */
export interface JoinedAttendanceLog extends AttendanceLog {
  employee?: Employee;
}

/**
 * Fetches all attendance logs (login/logout logs) and merges them with employee details.
 * Performs dual-key zipping for absolute resilience.
 */
export async function getAllAttendanceLogs(): Promise<JoinedAttendanceLog[]> {
  console.log('[DEBUG] Calling getAllAttendanceLogs()...');
  
  // Strategy: Fetch all logs and zip with employees
  const [logsResult, employees] = await Promise.all([
    supabase.from('attendance').select('*').order('login_time', { ascending: false }),
    getAllEmployees()
  ]);

  if (logsResult.error) {
    console.error('[DEBUG] Error fetching attendance logs:', logsResult.error);
    throw logsResult.error;
  }

  console.log(`[DEBUG] Fetched ${logsResult.data?.length || 0} raw attendance logs and ${employees.length} employees.`);

  const mapped = (logsResult.data || []).map(log => {
    // Audit both integer id and string employee_id fields
    const employee = employees.find(emp => 
      String(emp.id) === String(log.employee_id) || 
      String(emp.employee_id) === String(log.employee_id)
    );

    if (!employee) {
      console.warn(`[DEBUG] Warning: No matching employee found for attendance log ID ${log.id} (log.employee_id = ${log.employee_id})`);
    }

    return {
      ...log,
      employee
    };
  });

  console.log('[DEBUG] Completed mapping in getAllAttendanceLogs(). Result sample:', mapped.slice(0, 3));
  return mapped;
}

/**
 * Fetches attendance logs filtered by date (YYYY-MM-DD).
 */
export async function getAttendanceLogsByDate(dateStr: string): Promise<JoinedAttendanceLog[]> {
  console.log(`[DEBUG] Calling getAttendanceLogsByDate(${dateStr})...`);

  const [logsResult, employees] = await Promise.all([
    supabase
      .from('attendance')
      .select('*')
      .gte('login_time', `${dateStr}T00:00:00Z`)
      .lte('login_time', `${dateStr}T23:59:59Z`)
      .order('login_time', { ascending: false }),
    getAllEmployees()
  ]);

  if (logsResult.error) {
    console.error(`[DEBUG] Error in getAttendanceLogsByDate(${dateStr}):`, logsResult.error);
    throw logsResult.error;
  }

  console.log(`[DEBUG] Date ${dateStr}: Found ${logsResult.data?.length || 0} raw logs.`);

  const mapped = (logsResult.data || []).map(log => {
    const employee = employees.find(emp => 
      String(emp.id) === String(log.employee_id) || 
      String(emp.employee_id) === String(log.employee_id)
    );

    return {
      ...log,
      employee
    };
  });

  return mapped;
}

/**
 * Saves or updates an attendance record.
 */
export async function saveAttendanceLog(log: Omit<AttendanceLog, 'id'>): Promise<AttendanceLog> {
  console.log('[DEBUG] Calling saveAttendanceLog() with payload:', log);
  const { data, error } = await supabase
    .from('attendance')
    .insert([log])
    .select()
    .single();

  if (error) {
    console.error('[DEBUG] Error saving attendance log:', error);
    throw error;
  }
  return data;
}

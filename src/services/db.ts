import { supabase } from '../lib/supabase';
import type { DashboardMetrics, WeeklyActivityTrend, DepartmentSummary } from '../types';

// Re-export modular services for absolute backward compatibility and modular architecture
export * from './employeeService';
export * from './attendanceService';
export * from './travelService';

/**
 * Finds the latest date containing any check-in or travel session records in the database.
 * If none exists, falls back to today's date.
 */
export async function getLatestActiveDate(): Promise<string> {
  console.log('[DEBUG] Calling getLatestActiveDate()...');
  try {
    const [attResult, travelResult] = await Promise.all([
      supabase.from('attendance').select('login_time').order('login_time', { ascending: false }).limit(1),
      supabase.from('travel_sessions').select('created_at').order('created_at', { ascending: false }).limit(1)
    ]);

    let latestDate = new Date();
    let latestTime = 0;

    if (attResult.data && attResult.data.length > 0 && attResult.data[0].login_time) {
      const d = new Date(attResult.data[0].login_time);
      if (d.getTime() > latestTime) {
        latestTime = d.getTime();
        latestDate = d;
      }
    }

    if (travelResult.data && travelResult.data.length > 0) {
      const d = new Date(travelResult.data[0].created_at);
      if (d.getTime() > latestTime) {
        latestTime = d.getTime();
        latestDate = d;
      }
    }

    const formatted = latestDate.toISOString().split('T')[0];
    console.log('[DEBUG] Detected latest active database log date:', formatted);
    return formatted;
  } catch (err) {
    console.warn('[DEBUG] Error finding latest active date, defaulting to today:', err);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Fetches dashboard card metrics for today from the real Supabase tables.
 */
export async function getDashboardMetrics(dateStr: string): Promise<DashboardMetrics> {
  console.log(`[DEBUG] Calling getDashboardMetrics(${dateStr})...`);
  try {
    // 1. Get total employees count
    const { count: totalEmployees, error: empErr } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (empErr) throw empErr;

    // 2. Get attendance logs today (all check-ins/check-outs)
    const { data: attendanceToday, error: attErr } = await supabase
      .from('attendance')
      .select('employee_id, clock_type, login_time')
      .gte('login_time', `${dateStr}T00:00:00Z`)
      .lte('login_time', `${dateStr}T23:59:59Z`);

    if (attErr) throw attErr;

    // 3. Get total travel sessions today
    const { count: totalTravelToday, error: travelErr } = await supabase
      .from('travel_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lte('created_at', `${dateStr}T23:59:59Z`);

    if (travelErr) throw travelErr;

    // Distinct active employees are those who clocked in/out today
    const activeEmpSet = new Set(attendanceToday?.map(log => String(log.employee_id)) || []);
    const activeEmployees = activeEmpSet.size;

    // Total attendance today is total check-in actions
    const totalAttendanceToday = attendanceToday?.filter(log => log.clock_type === 'Login').length || 0;

    console.log(`[DEBUG] Dashboard metrics compiled for ${dateStr}:`, {
      totalEmployees,
      activeEmployees,
      totalTravelToday,
      totalAttendanceToday
    });

    return {
      totalEmployees: totalEmployees || 0,
      activeEmployees: activeEmployees,
      totalTravelToday: totalTravelToday || 0,
      totalAttendanceToday: totalAttendanceToday
    };
  } catch (err) {
    console.error('[DEBUG] Error fetching real dashboard metrics:', err);
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      totalTravelToday: 0,
      totalAttendanceToday: 0
    };
  }
}

/**
 * Generates daily activity trends for the last 5 calendar days.
 */
export async function getWeeklyActivityTrend(endDateStr: string): Promise<WeeklyActivityTrend[]> {
  console.log(`[DEBUG] Calling getWeeklyActivityTrend(${endDateStr})...`);
  try {
    const end = new Date(endDateStr);
    const trendData: WeeklyActivityTrend[] = [];

    // Construct the last 5 days
    for (let i = 4; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const targetDateStr = d.toISOString().split('T')[0];

      // Fetch attendance and travels for this day
      const [attRes, travelRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('id')
          .gte('login_time', `${targetDateStr}T00:00:00Z`)
          .lte('login_time', `${targetDateStr}T23:59:59Z`),
        supabase
          .from('travel_sessions')
          .select('id')
          .gte('created_at', `${targetDateStr}T00:00:00Z`)
          .lte('created_at', `${targetDateStr}T23:59:59Z`)
      ]);

      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      trendData.push({
        date: dayName,
        Logins: attRes.data?.length || 0,
        Travels: travelRes.data?.length || 0
      });
    }

    console.log('[DEBUG] Compiled weekly trend:', trendData);
    return trendData;
  } catch (err) {
    console.error('[DEBUG] Error fetching weekly trend logs:', err);
    return [];
  }
}

/**
 * Generates an activity summary grouped by role (Admin vs Employee).
 */
export async function getRoleSummaryReport(dateStr: string): Promise<DepartmentSummary[]> {
  console.log(`[DEBUG] Calling getRoleSummaryReport(${dateStr})...`);
  try {
    // 1. Get all employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('employee_id, role');

    if (empErr) throw empErr;

    // 2. Get attendance logs today
    const { data: attendanceToday, error: attErr } = await supabase
      .from('attendance')
      .select('employee_id')
      .gte('login_time', `${dateStr}T00:00:00Z`)
      .lte('login_time', `${dateStr}T23:59:59Z`);

    if (attErr) throw attErr;

    const activeEmpSet = new Set(attendanceToday?.map(log => String(log.employee_id)) || []);

    // Group by role
    const groups = new Map<string, { total: number; active: number }>();
    
    // Set standard roles to guarantee they appear
    groups.set('Employee', { total: 0, active: 0 });
    groups.set('Admin', { total: 0, active: 0 });

    employees?.forEach(emp => {
      const roleName = emp.role || 'Employee';
      const stats = groups.get(roleName) || { total: 0, active: 0 };
      stats.total++;
      if (activeEmpSet.has(String(emp.employee_id))) {
        stats.active++;
      }
      groups.set(roleName, stats);
    });

    const report = Array.from(groups.entries()).map(([role, stats]) => {
      const percentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
      return {
        department: role,
        total: stats.total,
        active: stats.active,
        percentage
      };
    });

    console.log('[DEBUG] Compiled role summary report:', report);
    return report;
  } catch (err) {
    console.error('[DEBUG] Error generating role summary report:', err);
    return [];
  }
}

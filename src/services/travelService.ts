import { supabase } from '../lib/supabase';
import type { TravelSession, Employee } from '../types';
import { getAllEmployees } from './employeeService';

/**
 * Interface representing TravelSession joined with Employee
 */
export interface JoinedTravelSession extends TravelSession {
  employee?: Employee;
}

/**
 * Fetches all travel sessions and joins them with employee details.
 * Implements resilient dual-key matching with debugging logs.
 */
export async function getAllTravelSessions(): Promise<JoinedTravelSession[]> {
  console.log('[DEBUG] Calling getAllTravelSessions()...');
  
  const [sessionsResult, employees] = await Promise.all([
    supabase.from('travel_sessions').select('*').order('created_at', { ascending: false }),
    getAllEmployees()
  ]);

  if (sessionsResult.error) {
    console.error('[DEBUG] Error fetching travel sessions:', sessionsResult.error);
    throw sessionsResult.error;
  }

  console.log(`[DEBUG] Fetched ${sessionsResult.data?.length || 0} raw travel sessions and ${employees.length} employees.`);

  const mapped = (sessionsResult.data || []).map(session => {
    // Resilient lookup checking both primary key ID (integer) and custom string employee_id
    const employee = employees.find(emp => 
      String(emp.id) === String(session.employee_id) || 
      String(emp.employee_id) === String(session.employee_id)
    );

    if (!employee) {
      console.warn(`[DEBUG] Warning: No matching employee found for travel session ID ${session.id} (session.employee_id = ${session.employee_id})`);
    }

    return {
      ...session,
      employee
    };
  });

  console.log('[DEBUG] Completed mapping in getAllTravelSessions(). Result sample:', mapped.slice(0, 3));
  return mapped;
}

/**
 * Fetches travel sessions filtered by a specific date (YYYY-MM-DD).
 */
export async function getTravelSessionsByDate(dateStr: string): Promise<JoinedTravelSession[]> {
  console.log(`[DEBUG] Calling getTravelSessionsByDate(${dateStr})...`);

  const [sessionsResult, employees] = await Promise.all([
    supabase
      .from('travel_sessions')
      .select('*')
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lte('created_at', `${dateStr}T23:59:59Z`)
      .order('created_at', { ascending: false }),
    getAllEmployees()
  ]);

  if (sessionsResult.error) {
    console.error(`[DEBUG] Error in getTravelSessionsByDate(${dateStr}):`, sessionsResult.error);
    throw sessionsResult.error;
  }

  console.log(`[DEBUG] Date ${dateStr}: Found ${sessionsResult.data?.length || 0} raw travel sessions.`);

  const mapped = (sessionsResult.data || []).map(session => {
    const employee = employees.find(emp => 
      String(emp.id) === String(session.employee_id) || 
      String(emp.employee_id) === String(session.employee_id)
    );

    return {
      ...session,
      employee
    };
  });

  return mapped;
}

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Loader2, 
  MapPin, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Inbox,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';
import { getAllEmployees } from '../../services/employeeService';
import { getAttendanceLogsByDate } from '../../services/attendanceService';
import { getLatestActiveDate } from '../../services/db';
import type { Employee } from '../../types';
import type { JoinedAttendanceLog } from '../../services/attendanceService';

export default function AttendanceContent() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<JoinedAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-discover the latest logged date in the database on load
  useEffect(() => {
    async function initializeDate() {
      console.log('[DEBUG] Attendance ledger initializing...');
      try {
        const latest = await getLatestActiveDate();
        console.log('[DEBUG] Auto-detected latest active date for ledger:', latest);
        setSelectedDate(latest);
      } catch (err) {
        console.warn('[DEBUG] Error during ledger date auto-discovery, using today:', err);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
    initializeDate();
  }, []);

  const fetchAttendanceRoster = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);
    console.log(`[DEBUG] Querying attendance ledger for target date: ${selectedDate}`);
    try {
      const [empList, logs] = await Promise.all([
        getAllEmployees(),
        getAttendanceLogsByDate(selectedDate)
      ]);
      console.log(`[DEBUG] Fetched ${empList.length} employees and ${logs.length} attendance logs.`);
      setEmployees(empList);
      setAttendanceLogs(logs);
    } catch (err: any) {
      console.error('[DEBUG] Error fetching attendance ledger:', err);
      setError('Failed to fetch attendance records. Please verify database configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRoster();
  }, [selectedDate]);

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Constructing ledger roster...</p>
      </div>
    );
  }

  // Map employees to their logs for this date
  const employeeAttendanceRoster = employees.map(emp => {
    // Resilient matching strategy: check if the log's employee_id matches either the employee's ID (int) or employee_id (code)
    const logs = attendanceLogs.filter(log => 
      String(log.employee_id) === String(emp.id) || 
      String(log.employee_id) === String(emp.employee_id)
    );
    
    // Check if clocked in or out
    const loginLog = logs.find(log => log.clock_type === 'Login');
    const logoutLog = logs.find(log => log.clock_type === 'Logout');

    const hasIn = !!loginLog;
    const hasOut = !!logoutLog;

    return {
      employee: emp,
      loginLog,
      logoutLog,
      isClockedIn: hasIn,
      isClockedOut: hasOut,
      status: hasOut ? 'Clocked Out' : hasIn ? 'Active' : 'Absent'
    };
  });

  console.log('[DEBUG] Compiled attendance ledger entries:', employeeAttendanceRoster);

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Ledger</h1>
          <p className="text-sm font-medium text-slate-500">Track daily employee check-ins, addresses, and selfie verifications.</p>
        </div>
      </div>

      {/* 2. Controls Grid */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/50 sm:grid-cols-12 sm:items-center">
        {/* Date Selector */}
        <div className="relative sm:col-span-6">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Date</label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar className="h-4.5 w-4.5" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="sm:col-span-6 flex items-center gap-2 bg-indigo-50/50 rounded-xl p-3 text-xs font-bold text-indigo-700 border border-indigo-50">
          <Sparkles className="h-4.5 w-4.5 shrink-0 text-indigo-500" />
          <span>Selfie photos and coordinates are audited in real time during mobile device check-ins.</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Checklist Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
        {employeeAttendanceRoster.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Attendance Status</th>
                    <th className="py-4 px-6">Check In / Out Times</th>
                    <th className="py-4 px-6">Physical location Address</th>
                    <th className="py-4 px-6 text-right">Selfie Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employeeAttendanceRoster.map(({ employee, loginLog, logoutLog, isClockedIn, isClockedOut, status }) => {
                    const initials = employee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    const currentLog = loginLog || logoutLog;

                    return (
                      <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Employee Name */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-700">{employee.name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">{employee.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status Marker */}
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                            isClockedOut 
                              ? 'bg-blue-50 text-blue-700' 
                              : isClockedIn 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isClockedOut ? (
                              <Clock className="h-3.5 w-3.5" />
                            ) : isClockedIn ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                            {status}
                          </span>
                        </td>

                        {/* Log times */}
                        <td className="py-3.5 px-6 font-semibold text-xs text-slate-500">
                          <div className="space-y-1">
                            {loginLog && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">In:</span>
                                <span>{new Date(loginLog.login_time || loginLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                            {logoutLog && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Out:</span>
                                <span>{new Date(logoutLog.login_time || logoutLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            )}
                            {!loginLog && !logoutLog && <span className="text-slate-400 italic">No actions logged</span>}
                          </div>
                        </td>

                        {/* Address coordinates */}
                        <td className="py-3.5 px-6 max-w-[280px]">
                          {currentLog?.location ? (
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-xs font-medium text-slate-600 truncate" title={currentLog.location}>
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                {currentLog.location}
                              </span>
                              {currentLog.latitude && currentLog.longitude && (
                                <span className="text-[9px] font-mono text-slate-400 pl-5 font-bold">GPS: {currentLog.latitude.toFixed(5)}, {currentLog.longitude.toFixed(5)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Location not logged</span>
                          )}
                        </td>

                        {/* Selfie Proof image */}
                        <td className="py-3.5 px-6 text-right">
                          {currentLog?.photo_url ? (
                            <a
                              href={currentLog.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                              View Selfie
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold italic">No proof</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-md font-bold text-slate-700">Roster Empty</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400 font-semibold">
              We couldn't locate any employees registered in the roster directory. Navigate to the Employee Directory to register employees first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

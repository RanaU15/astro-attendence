import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Download, 
  Compass, 
  MapPin, 
  Activity,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  getAllEmployees,
  getAllAttendanceLogs,
  getAllTravelSessions
} from '../../services/db';
import type { 
  Employee,
  JoinedAttendanceLog,
  JoinedTravelSession
} from '../../services/db';

interface EmployeeReportRow {
  employee: Employee;
  totalLogins: number;
  totalTravels: number;
  totalDistanceKm: number;
}

export default function ReportsContent() {
  const [reportRows, setReportRows] = useState<EmployeeReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function compileReports() {
      setLoading(true);
      setError(null);
      try {
        const [employees, logs, travel] = await Promise.all([
          getAllEmployees(),
          getAllAttendanceLogs(),
          getAllTravelSessions()
        ]);

        const rows: EmployeeReportRow[] = employees.map(emp => {
          // Count logins today or in history
          const employeeLogins = logs.filter(log => log.employee_id === emp.employee_id && log.clock_type === 'Login').length;
          
          // Count travels and accumulate distance
          const employeeTravels = travel.filter(t => t.employee_id === emp.employee_id);
          const totalTravelCount = employeeTravels.length;
          const totalDistanceMeters = employeeTravels.reduce((sum, t) => {
            return sum + (t.total_distance || t.reached_distance || 0);
          }, 0);

          return {
            employee: emp,
            totalLogins: employeeLogins,
            totalTravels: totalTravelCount,
            totalDistanceKm: parseFloat((totalDistanceMeters / 1000).toFixed(2))
          };
        });

        setReportRows(rows);
      } catch (err: any) {
        console.error('Error compiling reports:', err);
        setError('Failed to aggregate employee metrics for reporting.');
      } finally {
        setLoading(false);
      }
    }
    compileReports();
  }, []);

  const handleExport = () => {
    if (reportRows.length === 0) return;
    
    // Simulate downloading CSV
    const headers = 'Employee Name,Employee ID,Role,Total Logins,Total Travels,Total Distance (km)\n';
    const rows = reportRows.map(r => 
      `"${r.employee.name}","${r.employee.employee_id}","${r.employee.role}",${r.totalLogins},${r.totalTravels},${r.totalDistanceKm}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AuraAttend_Employee_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format data specifically for chart comparing travel distances
  const chartData = reportRows
    .filter(r => r.totalDistanceKm > 0)
    .map((r) => ({
      name: r.employee.name.split(' ')[0], // Use first name
      'Distance (km)': r.totalDistanceKm,
    }));

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Analyze overall employee attendance active logs and field travel metrics.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExport}
          disabled={loading || reportRows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 active:scale-98"
        >
          <Download className="h-4.5 w-4.5 text-slate-500" />
          Export CSV Report
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregating records...</p>
        </div>
      ) : reportRows.length > 0 ? (
        <div className="space-y-6">
          {/* 2. Distance Traveled Recharts Bar Chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Field Mileage Audit</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Cumulative travel distances in kilometers per employee</p>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                  <Compass className="h-3.5 w-3.5" />
                  <span>GPS Audited</span>
                </div>
              </div>
              
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#e2e8f0', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                      }} 
                    />
                    <Bar dataKey="Distance (km)" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. Roster Report Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6 text-center">Authority Role</th>
                    <th className="py-4 px-6 text-center">Total Checkins</th>
                    <th className="py-4 px-6 text-center">Total Travel Sessions</th>
                    <th className="py-4 px-6 text-right">Distance Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {reportRows.map((row) => {
                    const initials = row.employee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    
                    return (
                      <tr key={row.employee.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Employee Name */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">
                              {initials}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700">{row.employee.name}</span>
                              <p className="text-[10px] text-slate-400 font-semibold">ID: {row.employee.employee_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-6 text-center text-slate-500 font-semibold">
                          <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                            row.employee.role === 'Admin' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {row.employee.role || 'Employee'}
                          </span>
                        </td>

                        {/* Total Logins */}
                        <td className="py-3 px-6 text-center text-emerald-600 font-bold">
                          <div className="inline-flex items-center gap-1.5">
                            <Activity className="h-4 w-4" />
                            {row.totalLogins} logs
                          </div>
                        </td>

                        {/* Total Travels */}
                        <td className="py-3 px-6 text-center text-amber-600 font-bold">
                          <div className="inline-flex items-center gap-1.5">
                            <Compass className="h-4 w-4" />
                            {row.totalTravels} journeys
                          </div>
                        </td>

                        {/* Distance Logged */}
                        <td className="py-3 px-6 text-right font-bold text-slate-800">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <MapPin className="h-4 w-4 text-rose-500" />
                            {row.totalDistanceKm} km
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center border border-slate-200 rounded-2xl bg-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <Inbox className="h-7 w-7" />
          </div>
          <h3 className="text-md font-bold text-slate-700">No Analytics Found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400 font-semibold">
            We couldn't locate any historical logs registered under your Supabase database. Connect your APK device to register actions first.
          </p>
        </div>
      )}
    </div>
  );
}

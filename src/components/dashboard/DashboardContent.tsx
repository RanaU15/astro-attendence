import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  MapPin, 
  TrendingUp,
  Loader2, 
  Calendar, 
  Navigation,
  Activity,
  History,
  Compass,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  getDashboardMetrics, 
  getWeeklyActivityTrend, 
  getRoleSummaryReport,
  getAllAttendanceLogs,
  getAllTravelSessions,
  getLatestActiveDate
} from '../../services/db';
import type { JoinedAttendanceLog, JoinedTravelSession } from '../../services/db';
import type { DashboardMetrics, WeeklyActivityTrend, DepartmentSummary } from '../../types';

export default function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyActivityTrend[]>([]);
  const [roleReport, setRoleReport] = useState<DepartmentSummary[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<JoinedAttendanceLog[]>([]);
  const [travelSessions, setTravelSessions] = useState<JoinedTravelSession[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'travel' | 'activity'>('sessions');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Initial load: discover the latest date in the database with records
  useEffect(() => {
    async function initializeDate() {
      console.log('[DEBUG] Initializing dashboard date...');
      try {
        const latestDate = await getLatestActiveDate();
        console.log('[DEBUG] Auto-detected latest logged date:', latestDate);
        setSelectedDate(latestDate);
      } catch (err) {
        console.warn('[DEBUG] Error during auto-date discovery, using today:', err);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
    initializeDate();
  }, []);

  async function fetchDashboardData() {
    if (!selectedDate) return; // Wait until date is resolved

    setLoading(true);
    setError(null);
    console.log(`[DEBUG] Fetching dashboard data for target date: ${selectedDate}`);
    
    try {
      const [
        fetchedMetrics, 
        fetchedWeekly, 
        fetchedRoles,
        fetchedLogs,
        fetchedTravel
      ] = await Promise.all([
        getDashboardMetrics(selectedDate),
        getWeeklyActivityTrend(selectedDate),
        getRoleSummaryReport(selectedDate),
        getAllAttendanceLogs(),
        getAllTravelSessions()
      ]);

      console.log('[DEBUG] Fetched raw logs. Count:', fetchedLogs.length);
      console.log('[DEBUG] Fetched travel sessions. Count:', fetchedTravel.length);

      // Filter attendance logs by selectedDate for the visual feed in "Sessions"
      const filteredLogs = fetchedLogs.filter(log => {
        const logDate = new Date(log.created_at).toISOString().split('T')[0];
        return logDate === selectedDate;
      });

      // Filter travel sessions by selectedDate for "Travel Sessions History"
      const filteredTravel = fetchedTravel.filter(session => {
        const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
        return sessionDate === selectedDate;
      });

      console.log('[DEBUG] Filtered logs count for date:', selectedDate, 'is', filteredLogs.length);
      console.log('[DEBUG] Filtered travel count for date:', selectedDate, 'is', filteredTravel.length);

      setMetrics(fetchedMetrics);
      setWeeklyData(fetchedWeekly);
      setRoleReport(fetchedRoles);
      
      // Store all logs in history so timeline shows everything, but filter the session grids
      setAttendanceLogs(filteredLogs);
      setTravelSessions(filteredTravel);

    } catch (err: any) {
      console.error('[DEBUG] Failed to load dashboard details:', err);
      setError('Unable to load dashboard records. Please verify Supabase connections.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Aggregating real APK dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Database Connection Failed</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-md">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Fallback defaults
  const totalEmployees = metrics?.totalEmployees || 0;
  const activeEmployees = metrics?.activeEmployees || 0;
  const totalTravelToday = metrics?.totalTravelToday || 0;
  const totalAttendanceToday = metrics?.totalAttendanceToday || 0;

  const statCards = [
    {
      title: 'Total Employees',
      value: totalEmployees,
      description: 'Registered team roster',
      icon: Users,
      colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: 'Active Employees',
      value: activeEmployees,
      description: 'Logged actions today',
      icon: CheckCircle,
      colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Total Travel Today',
      value: totalTravelToday,
      description: 'Journeys recorded today',
      icon: Navigation,
      colorClass: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      title: 'Total Attendance Today',
      value: totalAttendanceToday,
      description: 'Total Present clock ins',
      icon: Activity,
      colorClass: 'bg-violet-50 text-violet-600 border-violet-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome, Administrator</h1>
          <p className="text-sm font-medium text-slate-500">Real-time team analytics connected to your Supabase APK backend.</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm font-semibold text-slate-700 outline-none outline-offset-0 transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>
      </div>

      {/* 2. Metrics Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.title} 
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-100/50 transition-all hover:scale-[1.01] hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.title}</span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold tracking-tight text-slate-800">{card.value}</h3>
                <p className="mt-1 text-xs text-slate-400 font-semibold">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Recharts Graphics Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Weekly Trend Graph Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 lg:col-span-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Weekly System Activity Trend</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Comparison of clock-ins and journeys over the last 5 days</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Realtime Connected</span>
            </div>
          </div>
          
          <div className="h-80 w-full">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTravels" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Logins" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorLogins)" />
                  <Area type="monotone" dataKey="Travels" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTravels)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                No activity trend logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Role Distribution List Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 lg:col-span-4">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Role Representation</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Active ratios grouped by authority roles</p>
          </div>

          <div className="space-y-6">
            {roleReport.length > 0 ? (
              roleReport.map((item) => (
                <div key={item.department} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-500" />
                      {item.department}s
                    </span>
                    <span className="text-slate-800">{item.percentage}% active</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div 
                      className="h-2 rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{item.total} total</span>
                    <span>{item.active} active logs today</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-400">
                No role records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tabbed Real Data Tables Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-2 gap-4">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'sessions' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-4.5 w-4.5" />
            Login/Logout Sessions
          </button>
          <button
            onClick={() => setActiveTab('travel')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'travel' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Compass className="h-4.5 w-4.5" />
            Travel Sessions History
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'activity' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4.5 w-4.5" />
            Employee Activity Feed
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* TAB 1: LOGIN/LOGOUT SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              {attendanceLogs.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Clock Action</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Selfie Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {attendanceLogs.map((log) => {
                      const empName = log.employee?.name || 'Unknown Employee';
                      const empCode = log.employee?.employee_id || log.employee_id;
                      const initials = empName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 text-xs">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-700">{empName}</h4>
                                <p className="text-[10px] text-slate-400 font-mono font-medium">Code: {empCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                              log.clock_type === 'Login' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {log.clock_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-500">
                            {log.login_time ? new Date(log.login_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : log.logout_time ? new Date(log.logout_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate" title={log.location}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              {log.location || 'Unknown location'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {log.photo_url ? (
                              <a 
                                href={log.photo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 hover:bg-indigo-100"
                              >
                                View Verification Image
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold italic">No image logged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No login/logout sessions logged for this date.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRAVEL SESSIONS HISTORY */}
          {activeTab === 'travel' && (
            <div className="overflow-x-auto">
              {travelSessions.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Start Milestone</th>
                      <th className="py-3 px-4">Destination / End Address</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Distance Covered</th>
                      <th className="py-3 px-4">Time Elapsed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {travelSessions.map((session) => {
                      const empName = session.employee?.name || 'Unknown Employee';
                      const initials = empName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                      const statusColor = 
                        session.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : session.status === 'reached' 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'bg-amber-50 text-amber-700';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 text-xs">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-700">{empName}</h4>
                                <p className="text-[10px] text-slate-400 font-mono font-medium">Session #{session.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate" title={session.start_address}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              {session.start_address || 'Starting...'}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate" title={session.end_address || session.reached_address}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              {session.end_address || session.reached_address || 'In Journey'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${statusColor}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700 text-xs">
                            {session.total_distance 
                              ? `${(session.total_distance / 1000).toFixed(2)} km` 
                              : session.reached_distance 
                              ? `${(session.reached_distance / 1000).toFixed(2)} km` 
                              : '0.00 km'}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-500">
                            {session.start_time ? new Date(session.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No active travel sessions found for this date.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMPLOYEE ACTIVITY FEED */}
          {activeTab === 'activity' && (
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              {attendanceLogs.length > 0 || travelSessions.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                  {/* Interleave and sort by created_at */}
                  {[
                    ...attendanceLogs.map(l => ({ ...l, type: 'attendance' as const })),
                    ...travelSessions.map(t => ({ ...t, type: 'travel' as const }))
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 15)
                    .map((act, index) => {
                      const name = act.employee?.name || 'Unknown Employee';
                      const dateText = new Date(act.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={index} className="relative">
                          {/* Dot marker */}
                          <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                            act.type === 'attendance' ? 'bg-indigo-600' : 'bg-amber-500'
                          }`}></span>

                          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-slate-50">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-800 text-sm">
                                {name} 
                                {act.type === 'attendance' ? (
                                  <span className="font-medium text-slate-500"> clocked in at {act.location || 'site'}</span>
                                ) : (
                                  <span className="font-medium text-slate-500"> started a travel session to {act.end_address || 'milestone'}</span>
                                )}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400">{dateText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No activity history logged for this date.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

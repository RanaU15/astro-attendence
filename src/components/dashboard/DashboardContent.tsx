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
  AlertCircle,
  Clock,
  Briefcase,
  Percent,
  Download,
  Filter,
  UserCheck
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
  getAllEmployees,
  getAllAttendanceLogs,
  getAllTravelSessions
} from '../../services/db';
import type { Employee } from '../../types';
import type { JoinedAttendanceLog } from '../../services/attendanceService';
import type { JoinedTravelSession } from '../../services/travelService';

interface EmployeeSummaryRow {
  employee: Employee;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
  totalWorkingHours: number;
  totalDistanceKm: number;
}

export default function DashboardContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<JoinedAttendanceLog[]>([]);
  const [travelSessions, setTravelSessions] = useState<JoinedTravelSession[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05'); // Defaults to May 2026 where real data exists
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-05-31');
  
  const [activeTab, setActiveTab] = useState<'summary' | 'sessions' | 'travel'>('summary');

  // Load all foundational records from Supabase once on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      console.log('[DEBUG] Loading Supabase foundational database records...');
      try {
        const [empList, logs, sessions] = await Promise.all([
          getAllEmployees(),
          getAllAttendanceLogs(),
          getAllTravelSessions()
        ]);

        console.log(`[DEBUG] Loaded foundational data: ${empList.length} employees, ${logs.length} attendance logs, ${sessions.length} travel sessions.`);
        setEmployees(empList);
        setAttendanceLogs(logs);
        setTravelSessions(sessions);
      } catch (err: any) {
        console.error('[DEBUG] Foundational data fetch failed:', err);
        setError('Could not connect to Supabase. Make sure your database keys in the .env file are configured.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update date range when selectedMonth changes
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'custom') {
      const [year, month] = selectedMonth.split('-');
      const firstDay = `${year}-${month}-01`;
      
      // Calculate last day of the selected month
      const lastDayObj = new Date(parseInt(year), parseInt(month), 0);
      const lastDayStr = String(lastDayObj.getDate()).padStart(2, '0');
      const lastDay = `${year}-${month}-${lastDayStr}`;
      
      console.log(`[DEBUG] Syncing date range for month ${selectedMonth}: ${firstDay} to ${lastDay}`);
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Compiling real-time employee analytics ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Database Connection Error</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-md">{error}</p>
      </div>
    );
  }

  // --- FILTER PROCESSOR ---
  // Filter logs by date range and selected employee
  const filteredLogs = attendanceLogs.filter(log => {
    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    const matchesDate = logDate >= startDate && logDate <= endDate;
    
    const matchesEmployee = selectedEmployeeId === 'All' || 
      String(log.employee_id) === String(selectedEmployeeId) || 
      (log.employee && String(log.employee.employee_id) === String(selectedEmployeeId));

    return matchesDate && matchesEmployee;
  });

  // Filter travel sessions by date range and selected employee
  const filteredTravel = travelSessions.filter(session => {
    const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
    const matchesDate = sessionDate >= startDate && sessionDate <= endDate;
    
    const matchesEmployee = selectedEmployeeId === 'All' || 
      String(session.employee_id) === String(selectedEmployeeId) || 
      (session.employee && String(session.employee.employee_id) === String(selectedEmployeeId));

    return matchesDate && matchesEmployee;
  });

  // Calculate unique calendar days in the selected date range
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const totalCalendarDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  // Calculate total working days in the range (excluding weekends for standard reporting)
  let workingDays = 0;
  for (let i = 0; i < totalCalendarDays; i++) {
    const current = new Date(startD);
    current.setDate(startD.getDate() + i);
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Monday-Friday
      workingDays++;
    }
  }
  if (workingDays === 0) workingDays = totalCalendarDays; // Fallback if range is very small

  // --- STATS COMPILER & WORKING HOURS CALCULATION ---
  // Pair Login & Logout logs to calculate working hours accurately
  const calculateWorkingHoursForLogs = (logs: JoinedAttendanceLog[]): number => {
    // Group logs by employee and date
    const logsByEmployeeAndDate = new Map<string, JoinedAttendanceLog[]>();
    
    logs.forEach(log => {
      const logDate = new Date(log.created_at).toISOString().split('T')[0];
      const empId = log.employee?.employee_id || String(log.employee_id);
      const key = `${empId}_${logDate}`;
      
      const list = logsByEmployeeAndDate.get(key) || [];
      list.push(log);
      logsByEmployeeAndDate.set(key, list);
    });

    let totalHours = 0;

    logsByEmployeeAndDate.forEach(dayLogs => {
      const logins = dayLogs.filter(l => l.clock_type === 'Login').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const logouts = dayLogs.filter(l => l.clock_type === 'Logout').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // If we have paired login/logout on that day
      if (logins.length > 0 && logouts.length > 0) {
        const firstLogin = new Date(logins[0].created_at);
        const lastLogout = new Date(logouts[logouts.length - 1].created_at);
        const diffMs = lastLogout.getTime() - firstLogin.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Accumulate valid positive durations
        if (diffHours > 0 && diffHours < 24) {
          totalHours += diffHours;
        }
      } else if (logins.length > 0) {
        // If they clocked in but didn't clock out yet, count as a default active session duration of 8 hours or 0.1 hr check-in
        totalHours += 0.5; // Represents the logging action duration
      }
    });

    return parseFloat(totalHours.toFixed(2));
  };

  // --- INDIVIDUAL EMPLOYEE ANALYTICS ROW COMPILER ---
  const employeeSummaries: EmployeeSummaryRow[] = employees.map(emp => {
    // Filter records specifically for this employee
    const empLogs = filteredLogs.filter(log => 
      String(log.employee_id) === String(emp.id) || 
      String(log.employee_id) === String(emp.employee_id)
    );

    const empTravel = filteredTravel.filter(session => 
      String(session.employee_id) === String(emp.id) || 
      String(session.employee_id) === String(emp.employee_id)
    );

    // Calculate present days (unique calendar dates with check-ins)
    const presentDatesSet = new Set(empLogs.map(log => new Date(log.created_at).toISOString().split('T')[0]));
    const presentDays = presentDatesSet.size;
    
    // Calculate absent days based on total calendar days in search range minus present days
    const absentDays = Math.max(0, workingDays - presentDays);
    const attendanceRate = Math.min(100, Math.round((presentDays / workingDays) * 100));

    // Calculate working hours
    const totalWorkingHours = calculateWorkingHoursForLogs(empLogs);

    // Calculate travel distance
    const totalDistanceMeters = empTravel.reduce((sum, s) => sum + (s.total_distance || s.reached_distance || 0), 0);
    const totalDistanceKm = parseFloat((totalDistanceMeters / 1000).toFixed(2));

    return {
      employee: emp,
      presentDays,
      absentDays,
      attendanceRate,
      totalWorkingHours,
      totalDistanceKm
    };
  });

  // --- METRICS OVERVIEW COMPILER ---
  const totalPresentDaysSum = employeeSummaries.reduce((sum, row) => sum + row.presentDays, 0);
  const totalAbsentDaysSum = employeeSummaries.reduce((sum, row) => sum + row.absentDays, 0);
  const averageAttendanceRate = employees.length > 0 
    ? Math.round(employeeSummaries.reduce((sum, row) => sum + row.attendanceRate, 0) / employees.length)
    : 0;

  const totalWorkingHoursSum = employeeSummaries.reduce((sum, row) => sum + row.totalWorkingHours, 0);
  const totalTravelDistanceSum = employeeSummaries.reduce((sum, row) => sum + row.totalDistanceKm, 0);
  const totalJourneysCount = filteredTravel.length;

  // --- TREND CHART DATA COMPILER ---
  // Compile daily trends inside the selected date range
  const dailyTrendData = [];
  for (let i = 0; i < totalCalendarDays; i++) {
    const current = new Date(startD);
    current.setDate(startD.getDate() + i);
    const currentStr = current.toISOString().split('T')[0];

    const dayLogs = filteredLogs.filter(log => new Date(log.created_at).toISOString().split('T')[0] === currentStr);
    const dayTravel = filteredTravel.filter(session => new Date(session.created_at).toISOString().split('T')[0] === currentStr);

    // Only add dates that fall within the range
    dailyTrendData.push({
      date: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Active Logins': dayLogs.filter(l => l.clock_type === 'Login').length,
      'Travel Journeys': dayTravel.length
    });
  }

  // Define metric cards
  const statsList = [
    {
      title: 'Total Present Days',
      value: selectedEmployeeId === 'All' ? `${totalPresentDaysSum} days` : `${employeeSummaries.find(r => String(r.employee.employee_id) === selectedEmployeeId || String(r.employee.id) === selectedEmployeeId)?.presentDays || 0} days`,
      description: 'Cumulative check-in days',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      title: 'Absent Days',
      value: selectedEmployeeId === 'All' ? `${totalAbsentDaysSum} days` : `${employeeSummaries.find(r => String(r.employee.employee_id) === selectedEmployeeId || String(r.employee.id) === selectedEmployeeId)?.absentDays || 0} days`,
      description: 'Relative to working days in range',
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-600 border-rose-100'
    },
    {
      title: 'Attendance Percentage',
      value: selectedEmployeeId === 'All' ? `${averageAttendanceRate}%` : `${employeeSummaries.find(r => String(r.employee.employee_id) === selectedEmployeeId || String(r.employee.id) === selectedEmployeeId)?.attendanceRate || 0}%`,
      description: 'Average monthly performance',
      icon: Percent,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    },
    {
      title: 'Total Working Hours',
      value: selectedEmployeeId === 'All' ? `${totalWorkingHoursSum} hrs` : `${employeeSummaries.find(r => String(r.employee.employee_id) === selectedEmployeeId || String(r.employee.id) === selectedEmployeeId)?.totalWorkingHours || 0} hrs`,
      description: 'Clocked duration between logins',
      icon: Clock,
      color: 'bg-violet-50 text-violet-600 border-violet-100'
    },
    {
      title: 'Travel Distance Covered',
      value: selectedEmployeeId === 'All' ? `${totalTravelDistanceSum.toFixed(2)} km` : `${employeeSummaries.find(r => String(r.employee.employee_id) === selectedEmployeeId || String(r.employee.id) === selectedEmployeeId)?.totalDistanceKm || 0} km`,
      description: `Across ${selectedEmployeeId === 'All' ? totalJourneysCount : filteredTravel.length} journeys`,
      icon: Compass,
      color: 'bg-amber-50 text-amber-600 border-amber-100'
    }
  ];

  // Export report rows as CSV
  const handleExportCSV = () => {
    const headers = 'Employee Name,Employee ID,Present Days,Absent Days,Attendance Rate (%),Working Hours,Distance Covered (km)\n';
    const rows = employeeSummaries.map(r => 
      `"${r.employee.name}","${r.employee.employee_id}",${r.presentDays},${r.absentDays},${r.attendanceRate},${r.totalWorkingHours},${r.totalDistanceKm}`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Monthly_Employee_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Employee Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Compile aggregated performance audits and mileage tracking from Supabase.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-98"
        >
          <Download className="h-4 w-4" />
          Export Monthly Summary
        </button>
      </div>

      {/* 2. Advanced Multi-Filter Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="h-4.5 w-4.5 text-indigo-500" />
          <span>Interactive Audit Filters</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-12">
          {/* Month Selector */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
            >
              <option value="2026-05">May 2026</option>
              <option value="2026-04">April 2026</option>
              <option value="2026-03">March 2026</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Employee Selector */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
            >
              <option value="All">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.employee_id}>
                  {emp.name} (Code: {emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range Inputs */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedMonth('custom');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedMonth('custom');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Analytics Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statsList.map(card => {
          const Icon = card.icon;
          return (
            <div 
              key={card.title} 
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100/50 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">{card.value}</h3>
                <p className="mt-0.5 text-[10px] text-slate-400 font-semibold leading-relaxed">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Daily Trends Graphics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Monthly Operational Trends</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Fluctuations of login sessions and GPS travel tracking records</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Range: {startDate} to {endDate}</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTravels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                }} 
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
              <Area type="monotone" dataKey="Active Logins" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLogins)" />
              <Area type="monotone" dataKey="Travel Journeys" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTravels)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Combined Reports & Ledger Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-1 gap-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'summary' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4.5 w-4.5" />
            Monthly Roster Summary
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'sessions' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-4.5 w-4.5" />
            Check-in History logs
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
        </div>

        <div className="p-6">
          {/* TAB 1: MONTHLY ROSTER SUMMARY */}
          {activeTab === 'summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4 text-center">Present Days</th>
                    <th className="py-3 px-4 text-center">Absent Days</th>
                    <th className="py-3 px-4 text-center">Attendance Rate</th>
                    <th className="py-3 px-4 text-center">Working Hours</th>
                    <th className="py-3 px-4 text-right">Distance log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {employeeSummaries.map(row => {
                    const initials = row.employee.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                    return (
                      <tr key={row.employee.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 text-xs">
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-700">{row.employee.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono font-medium">Code: {row.employee.employee_id} • {row.employee.role || 'Employee'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-600 font-bold">{row.presentDays} days</td>
                        <td className="py-3 px-4 text-center text-rose-600 font-bold">{row.absentDays} days</td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-xs ${
                            row.attendanceRate >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {row.attendanceRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-indigo-600 font-bold">{row.totalWorkingHours} hrs</td>
                        <td className="py-3 px-4 text-right text-slate-800 font-bold">{row.totalDistanceKm} km</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CHECK-IN HISTORY LOGS */}
          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              {filteredLogs.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Address / Coordinates</th>
                      <th className="py-3 px-4 text-right">Selfie Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredLogs.map(log => {
                      const empName = log.employee?.name || 'Unknown Employee';
                      const initials = empName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                      const dateText = new Date(log.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/40">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 text-xs">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-700">{empName}</h4>
                                <p className="text-[10px] text-slate-400 font-mono font-medium">ID: {log.employee?.employee_id || log.employee_id}</p>
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
                          <td className="py-3 px-4 text-xs font-semibold text-slate-500">{dateText}</td>
                          <td className="py-3 px-4 max-w-[250px]">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate" title={log.location}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              {log.location || 'Unknown GPS'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.photo_url ? (
                              <a 
                                href={log.photo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 hover:bg-indigo-100 animate-pulse"
                              >
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
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No login/logout records found matching the active selection.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRAVEL SESSIONS HISTORY */}
          {activeTab === 'travel' && (
            <div className="overflow-x-auto">
              {filteredTravel.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Start Milestone</th>
                      <th className="py-3 px-4">Destination Milestone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Distance Logged</th>
                      <th className="py-3 px-4 text-right">Start / End Selfie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredTravel.map(session => {
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
                              {session.start_address || 'Awaiting starting landmark...'}
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
                          <td className="py-3 px-4 text-right space-x-1">
                            {session.start_photo_url && (
                              <a 
                                href={session.start_photo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex rounded bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-600 hover:text-indigo-700"
                              >
                                Start
                              </a>
                            )}
                            {(session.end_photo_url || session.reached_photo_url) && (
                              <a 
                                href={session.end_photo_url || session.reached_photo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex rounded bg-slate-100 hover:bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold text-rose-600 hover:text-rose-700"
                              >
                                End
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No travel sessions found matching the active selection.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

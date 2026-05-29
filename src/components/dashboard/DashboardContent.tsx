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
  UserCheck,
  UserX
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

interface GroupedAttendanceRecord {
  id: string;
  employee: Employee;
  dateStr: string;
  loginTime: string;
  logoutTime: string;
  workingHours: number;
  status: 'Present' | 'Absent';
  location: string;
  photoUrl: string;
  travelHours: number;
  travelDistance: number;
}

export default function DashboardContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<JoinedAttendanceLog[]>([]);
  const [travelSessions, setTravelSessions] = useState<JoinedTravelSession[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state (Defaults to May 2026 where real data exists)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-05'); 
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-05-31');
  
  const [activeTab, setActiveTab] = useState<'sessions' | 'travel' | 'summary'>('sessions');

  // Load foundational data from Supabase
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
        <p className="mt-4 text-sm font-semibold text-slate-500">Compiling daily paired employee records...</p>
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
  // Filter travel sessions by physical start_time date range and selected employee
  const filteredTravel = travelSessions.filter(session => {
    const dateToUse = session.start_time || session.created_at;
    if (!dateToUse) return false;
    const sessionDate = new Date(dateToUse).toISOString().split('T')[0];
    const matchesDate = sessionDate >= startDate && sessionDate <= endDate;
    
    const matchesEmployee = selectedEmployeeId === 'All' || 
      String(session.employee_id) === String(selectedEmployeeId) || 
      (session.employee && String(session.employee.employee_id) === String(selectedEmployeeId)) ||
      (session.employee && String(session.employee.id) === String(selectedEmployeeId));

    return matchesDate && matchesEmployee;
  });

  // Calculate unique calendar days in the selected date range
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const totalCalendarDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // --- CONSOLIDATED DAILY ATTENDANCE GROUPER ---
  const groupedRecords: GroupedAttendanceRecord[] = [];

  // Iterate over each date in range from latest down to earliest
  for (let i = totalCalendarDays - 1; i >= 0; i--) {
    const current = new Date(startD);
    current.setDate(startD.getDate() + i);
    const dateStr = current.toISOString().split('T')[0];
    
    // Group logs for each employee on this specific date
    employees.forEach(emp => {
      // Check employee filter
      const matchesEmpFilter = selectedEmployeeId === 'All' || 
        String(emp.employee_id) === String(selectedEmployeeId) || 
        String(emp.id) === String(selectedEmployeeId);
        
      if (!matchesEmpFilter) return;

      // Find logs on this date for this employee
      const dayLogs = attendanceLogs.filter(log => {
        const dateToUse = log.login_time || log.created_at;
        if (!dateToUse) return false;
        const logDate = new Date(dateToUse).toISOString().split('T')[0];
        const matchesEmp = String(log.employee_id) === String(emp.id) || 
                           String(log.employee_id) === String(emp.employee_id);
        return logDate === dateStr && matchesEmp;
      });

      // Find travel sessions on this date for this employee from already filtered list
      const dayTravels = filteredTravel.filter(s => {
        const dateToUse = s.start_time || s.created_at;
        if (!dateToUse) return false;
        const sessionDate = new Date(dateToUse).toISOString().split('T')[0];
        const matchesEmp = String(s.employee_id) === String(emp.id) || 
                           String(s.employee_id) === String(emp.employee_id);
        return sessionDate === dateStr && matchesEmp;
      });

      // Deduplicate day travel sessions by ID to prevent double counting
      const uniqueDayTravels = Array.from(
        new Map(dayTravels.map(s => [s.id, s])).values()
      );

      let dayTravelHours = 0;
      uniqueDayTravels.forEach(s => {
        if (s.start_time && s.end_time) {
          const diffMs = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
          const diffHrs = diffMs / (1000 * 60 * 60);
          if (diffHrs > 0 && diffHrs < 24) {
            dayTravelHours += diffHrs;
          }
        }
      });

      // Sum travel distance (KM)
      const dayDistanceSum = uniqueDayTravels.reduce((sum, s) => {
        return sum + (s.total_distance || s.reached_distance || 0);
      }, 0);

      const loginLog = dayLogs.find(l => l.clock_type === 'Login');
      const logoutLog = dayLogs.find(l => l.clock_type === 'Logout');

      if (loginLog || logoutLog) {
        // Pairing logic: calculate working hours between Earliest Login and Latest Logout
        const logTime = loginLog?.login_time;
        const outTime = logoutLog?.login_time;
        
        let hours = 0;
        if (logTime && outTime) {
          const diffMs = new Date(outTime).getTime() - new Date(logTime).getTime();
          const diffHrs = diffMs / (1000 * 60 * 60);
          if (diffHrs > 0 && diffHrs < 24) {
            hours = parseFloat(diffHrs.toFixed(2));
          }
        } else if (loginLog) {
          // Default minimal duration if check-out has not been completed
          hours = 0.5;
        }

        groupedRecords.push({
          id: `${emp.id}_${dateStr}`,
          employee: emp,
          dateStr,
          loginTime: logTime ? new Date(logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          logoutTime: outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          workingHours: hours,
          status: 'Present',
          location: loginLog?.location || logoutLog?.location || 'Unknown location',
          photoUrl: loginLog?.photo_url || logoutLog?.photo_url || '',
          travelHours: parseFloat(dayTravelHours.toFixed(2)),
          travelDistance: parseFloat(dayDistanceSum.toFixed(2))
        });
      } else {
        // Absent row
        // Don't show absents in the future relative to local date
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr <= todayStr) {
          groupedRecords.push({
            id: `${emp.id}_${dateStr}`,
            employee: emp,
            dateStr,
            loginTime: '—',
            logoutTime: '—',
            workingHours: 0,
            status: 'Absent',
            location: '—',
            photoUrl: '',
            travelHours: parseFloat(dayTravelHours.toFixed(2)),
            travelDistance: parseFloat(dayDistanceSum.toFixed(2))
          });
        }
      }
    });
  }

  // --- STATS OVERVIEW CARDS COMPILER ---
  // Deduplicate travel sessions by ID to guarantee single-pass summation and prevent duplicate records from inflating totals
  const uniqueFilteredTravel = Array.from(
    new Map(filteredTravel.map(s => [s.id, s])).values()
  );

  console.log('[DEBUG] Raw filteredTravel length:', filteredTravel.length);
  console.log('[DEBUG] Deduplicated uniqueFilteredTravel length:', uniqueFilteredTravel.length);
  console.log('[DEBUG] Deduplicated travel items:', uniqueFilteredTravel);

  const totalEmployeesCount = employees.length;
  const totalPresentCount = groupedRecords.filter(r => r.status === 'Present').length;
  const totalAbsentCount = groupedRecords.filter(r => r.status === 'Absent').length;
  const totalWorkingHoursSum = groupedRecords.reduce((sum, r) => sum + r.workingHours, 0);
  
  // Calculate total travel hours strictly from deduplicated sessions
  const totalTravelHoursSum = uniqueFilteredTravel.reduce((sum, s) => {
    if (s.start_time && s.end_time) {
      const diffMs = new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
      const hrs = diffMs / (1000 * 60 * 60);
      if (hrs > 0 && hrs < 24) return sum + hrs;
    }
    return sum;
  }, 0);

  // Calculate total travel distance (KM) strictly from deduplicated sessions
  const totalTravelDistanceSum = uniqueFilteredTravel.reduce((sum, s) => {
    return sum + (s.total_distance || s.reached_distance || 0);
  }, 0);

  console.log('[DEBUG] Final travel totals calculated directly from uniqueFilteredTravel:', {
    totalTravelHours: totalTravelHoursSum,
    totalTravelKM: totalTravelDistanceSum
  });

  // Compile individual employee analytics rows for the Roster tab
  const employeeSummaries = employees.map(emp => {
    const empRecords = groupedRecords.filter(r => String(r.employee.employee_id) === String(emp.employee_id));
    const presentDays = empRecords.filter(r => r.status === 'Present').length;
    const absentDays = empRecords.filter(r => r.status === 'Absent').length;
    const totalWorkingHours = empRecords.reduce((sum, r) => sum + r.workingHours, 0);
    
    // Filter travel sessions
    const empTravel = uniqueFilteredTravel.filter(s => 
      String(s.employee_id) === String(emp.id) || 
      String(s.employee_id) === String(emp.employee_id)
    );
    const distanceKm = empTravel.reduce((sum, s) => sum + (s.total_distance || s.reached_distance || 0), 0);

    const totalDays = presentDays + absentDays;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      employee: emp,
      presentDays,
      absentDays,
      attendanceRate: rate,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      totalDistanceKm: parseFloat(distanceKm.toFixed(2))
    };
  });

  // Export report rows as CSV
  const handleExportCSV = () => {
    const headers = 'Employee Name,Date,Login Time,Logout Time,Working Hours,Status,Travel Hours,Travel Distance,Location\n';
    const rows = groupedRecords.map(r => 
      `"${r.employee.name}","${r.dateStr}","${r.loginTime}","${r.logoutTime}",${r.workingHours},"${r.status}",${r.travelHours},${r.travelDistance},"${r.location}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Attendance_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define metric cards
  const statsList = [
    {
      title: 'Total Employees',
      value: totalEmployeesCount,
      description: 'Registered roster size',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100'
    },
    {
      title: 'Present Days',
      value: `${totalPresentCount} days`,
      description: 'Present check-in logs',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    },
    {
      title: 'Absent Days',
      value: `${totalAbsentCount} days`,
      description: 'Absent daily records',
      icon: UserX,
      color: 'bg-rose-50 text-rose-600 border-rose-100'
    },
    {
      title: 'Total Working Hours',
      value: `${totalWorkingHoursSum.toFixed(1)} hrs`,
      description: 'Cumulative active hours',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600 border-blue-100'
    },
    {
      title: 'Total Travel Hours',
      value: `${totalTravelHoursSum.toFixed(1)} hrs`,
      description: 'Time spent in transit',
      icon: History,
      color: 'bg-violet-50 text-violet-600 border-violet-100'
    },
    {
      title: 'Total Travel KM',
      value: `${totalTravelDistanceSum.toFixed(1)} km`,
      description: 'Cumulative travel distance',
      icon: Compass,
      color: 'bg-amber-50 text-amber-600 border-amber-100'
    }
  ];

  // Compile daily trend chart data
  const dailyTrendData = [];
  const trendDaysCount = Math.min(10, totalCalendarDays || 0);
  for (let i = trendDaysCount - 1; i >= 0; i--) {
    if (!startD) continue;
    const current = new Date(startD);
    current.setDate(startD.getDate() + i);
    let currentStr = '';
    try {
      currentStr = current.toISOString().split('T')[0];
    } catch (e) {
      continue;
    }

    const dayPresent = (groupedRecords || []).filter(r => r && r.dateStr === currentStr && r.status === 'Present').length;
    const dayTravelsCount = (uniqueFilteredTravel || []).filter(s => {
      if (!s) return false;
      const dateToUse = s.start_time || s.created_at;
      if (!dateToUse) return false;
      try {
        return new Date(dateToUse).toISOString().split('T')[0] === currentStr;
      } catch (e) {
        return false;
      }
    }).length;

    let formattedDateLabel = '';
    try {
      formattedDateLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      formattedDateLabel = currentStr;
    }

    dailyTrendData.push({
      date: formattedDateLabel,
      'Present Employees': dayPresent || 0,
      'Travel Journeys': dayTravelsCount || 0
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Monthly Employee Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Grouped daily check-ins, working hours, and travel audits from Supabase.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 active:scale-98"
        >
          <Download className="h-4 w-4" />
          Export Daily CSV Ledger
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <h3 className="text-lg font-bold text-slate-900">Roster Operations Trends</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Fluctuations of present staff and active mileage journeys</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Last {trendDaysCount} active range days</span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="Present Employees" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresent)" />
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
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'sessions' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-4.5 w-4.5" />
            Grouped Daily Attendance
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
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'summary' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-4.5 w-4.5" />
            Monthly Staff Summary
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: GROUPED DAILY ATTENDANCE RECORD */}
          {activeTab === 'sessions' && (
            <div className="overflow-x-auto">
              {groupedRecords.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4 text-center">Date</th>
                      <th className="py-3 px-4 text-center">Login Time</th>
                      <th className="py-3 px-4 text-center">Logout Time</th>
                      <th className="py-3 px-4 text-center">Working Hours</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Travel Hours</th>
                      <th className="py-3 px-4 text-center">Travel Distance</th>
                      <th className="py-3 px-4 text-right">Selfie Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {groupedRecords.map(r => {
                      const initials = r.employee.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                      
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40">
                          {/* Employee Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 text-xs">
                                {initials}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-700">{r.employee.name}</h4>
                                <p className="text-[10px] text-slate-400 font-mono font-medium">ID: {r.employee.employee_id}</p>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-500">
                            {r.dateStr}
                          </td>

                          {/* Login Time */}
                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                            {r.loginTime === '—' ? (
                              <span className="text-slate-450 italic">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{r.loginTime}</span>
                            )}
                          </td>

                          {/* Logout Time */}
                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                            {r.logoutTime === '—' ? (
                              <span className="text-slate-450 italic">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">{r.logoutTime}</span>
                            )}
                          </td>

                          {/* Working Hours */}
                          <td className="py-3 px-4 text-center font-bold text-slate-700">
                            {r.workingHours > 0 ? (
                              <span className="text-indigo-600 font-extrabold">{r.workingHours} hrs</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                              r.status === 'Present' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {r.status}
                            </span>
                          </td>

                          {/* Travel Hours */}
                          <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">
                            {r.travelHours > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold">{r.travelHours} hrs</span>
                            ) : (
                              <span className="text-slate-450 italic">—</span>
                            )}
                          </td>

                          {/* Travel Distance */}
                          <td className="py-3 px-4 text-center text-xs font-bold text-slate-700">
                            {r.travelDistance > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">{r.travelDistance} km</span>
                            ) : (
                              <span className="text-slate-450 italic">—</span>
                            )}
                          </td>

                          {/* Selfie Proof */}
                          <td className="py-3 px-4 text-right">
                            {r.photoUrl ? (
                              <a 
                                href={r.photoUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 hover:bg-indigo-100"
                              >
                                View Selfie
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 font-semibold italic">No image</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-10 font-semibold text-slate-400">
                  No grouped daily attendance records found in the active selection.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FIXED TRAVEL SESSIONS HISTORY */}
          {activeTab === 'travel' && (
            <div className="overflow-x-auto">
              {uniqueFilteredTravel.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-4">Employee Name</th>
                      <th className="py-3 px-4 text-center">Travel Date</th>
                      <th className="py-3 px-4">Start Milestone Address</th>
                      <th className="py-3 px-4">Destination Address</th>
                      <th className="py-3 px-4 text-center">Total Distance</th>
                      <th className="py-3 px-4 text-center">Travel Status</th>
                      <th className="py-3 px-4 text-right">Landmark Photos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {uniqueFilteredTravel.map(session => {
                      const empName = session.employee?.name || 'Unknown Employee';
                      const initials = empName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
                      const dateToUse = session.start_time || session.created_at;
                      const travelDate = dateToUse ? new Date(dateToUse).toISOString().split('T')[0] : '—';
                      const statusColor = 
                        session.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : session.status === 'reached' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100';

                      const distanceCovered = session.total_distance 
                        ? `${(session.total_distance / 1000).toFixed(2)} km` 
                        : session.reached_distance 
                        ? `${(session.reached_distance / 1000).toFixed(2)} km` 
                        : '0.00 km';

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/40">
                          {/* Employee Name */}
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

                          {/* Travel Date */}
                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-550">
                            {travelDate}
                          </td>

                          {/* Start Milestone */}
                          <td className="py-3 px-4 max-w-[180px]">
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium truncate" title={session.start_address}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              {session.start_address || 'Calculating start milestone...'}
                            </div>
                          </td>

                          {/* Destination */}
                          <td className="py-3 px-4 max-w-[180px]">
                            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium truncate" title={session.end_address || session.reached_address}>
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              {session.end_address || session.reached_address || 'In Journey'}
                            </div>
                          </td>

                          {/* Distance */}
                          <td className="py-3 px-4 text-center font-bold text-indigo-600 text-xs">
                            {distanceCovered}
                          </td>

                          {/* Travel Status */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${statusColor}`}>
                              {session.status}
                            </span>
                          </td>

                          {/* Photos */}
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

          {/* TAB 3: MONTHLY STAFF SUMMARY */}
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
        </div>
      </div>
    </div>
  );
}

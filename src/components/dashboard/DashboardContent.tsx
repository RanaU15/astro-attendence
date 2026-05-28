import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Percent, 
  Loader2, 
  Calendar, 
  ArrowUpRight,
  TrendingUp,
  School
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';
import { getDashboardMetrics, getWeeklyAttendanceTrend, getClassSummaryReport } from '../../services/db';
import type { DashboardMetrics, WeeklyAttendanceData, ClassAttendanceSummary } from '../../types';

export default function DashboardContent() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyAttendanceData[]>([]);
  const [classReport, setClassReport] = useState<ClassAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch data concurrently
        const [fetchedMetrics, fetchedWeekly, fetchedClasses] = await Promise.all([
          getDashboardMetrics(selectedDate),
          getWeeklyAttendanceTrend(selectedDate),
          getClassSummaryReport(selectedDate)
        ]);

        setMetrics(fetchedMetrics);
        setWeeklyData(fetchedWeekly);
        setClassReport(fetchedClasses);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Aggregating attendance metrics...</p>
      </div>
    );
  }

  // Fallback defaults
  const totalStudents = metrics?.totalStudents || 0;
  const presentToday = metrics?.presentToday || 0;
  const absentToday = metrics?.absentToday || 0;
  const attendanceRate = metrics?.attendancePercentage ?? 100;

  const statCards = [
    {
      title: 'Total Students',
      value: totalStudents,
      description: 'Enrolled in directory',
      icon: Users,
      colorClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      title: 'Present Today',
      value: presentToday,
      description: 'Marked as active today',
      icon: CheckCircle,
      colorClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      title: 'Absent Today',
      value: absentToday,
      description: 'Excused & unexcused absentees',
      icon: XCircle,
      colorClass: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      title: 'Attendance Rate',
      value: `${attendanceRate}%`,
      description: 'Class presence ratio',
      icon: Percent,
      colorClass: 'bg-violet-50 text-violet-600 border-violet-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Dashboard Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome, Administrator</h1>
          <p className="text-sm font-medium text-slate-500">Here is the attendance summary for your school.</p>
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
              className={`rounded-2xl border bg-white p-6 shadow-sm shadow-slate-100/50 transition-all hover:scale-[1.01] hover:shadow-md`}
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
              <h3 className="text-lg font-bold text-slate-900">Attendance Roll-Call Trend</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Presence comparison over the last 5 active school days</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Live Sync</span>
            </div>
          </div>
          
          <div className="h-80 w-full">
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
                  <Area type="monotone" dataKey="Present" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                  <Area type="monotone" dataKey="Absent" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                No attendance trend logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Classroom Distribution List Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 lg:col-span-4">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Classroom Standings</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Average attendance rate per grade</p>
          </div>

          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {classReport.length > 0 ? (
              classReport.map((item) => (
                <div key={item.class_name} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span className="flex items-center gap-2">
                      <School className="h-4 w-4 text-indigo-500" />
                      {item.class_name}
                    </span>
                    <span className="text-slate-800">{item.percentage}%</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        item.percentage >= 90 
                          ? 'bg-emerald-500' 
                          : item.percentage >= 75 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>{item.total} students</span>
                    <span>{item.present} Present • {item.absent} Absent</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-400">
                No classroom records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

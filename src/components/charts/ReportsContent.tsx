import React, { useState, useEffect } from 'react';
import { 
  School, 
  Loader2, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart,
  User,
  GraduationCap,
  Inbox
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
import { getStudentWiseAttendanceReport } from '../../services/db';
import type { StudentAttendanceStats } from '../../types';

export default function ReportsContent() {
  const [selectedClass, setSelectedClass] = useState('Grade 10');
  const [stats, setStats] = useState<StudentAttendanceStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      if (!selectedClass) return;
      setLoading(true);
      try {
        const data = await getStudentWiseAttendanceReport(selectedClass);
        setStats(data);
      } catch (err) {
        console.error('Error fetching student stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [selectedClass]);

  // Export mock report helper
  const handleExport = () => {
    if (stats.length === 0) return;
    
    // Simulate downloading CSV
    const headers = 'Full Name,Roll Number,Classroom,Total Days,Present Days,Absent Days,Percentage\n';
    const rows = stats.map(s => 
      `"${s.student.full_name}","${s.student.roll_number}","${s.student.class_name}",${s.totalDays},${s.presentDays},${s.absentDays},${s.percentage}%`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${selectedClass.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format data specifically for chart
  const chartData = stats.map((s) => ({
    name: s.student.full_name.split(' ')[0], // Use first name for chart label space
    Percentage: s.percentage,
  }));

  const classes = ['Grade 10', 'Grade 11', 'Grade 12', 'B.Sc CS', 'BCA', 'MCA'];

  return (
    <div className="space-y-6">
      {/* 1. Header with Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm font-medium text-slate-500">Analyze class statistics and student check-in records.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExport}
          disabled={loading || stats.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 active:scale-98"
        >
          <Download className="h-4.5 w-4.5 text-slate-500" />
          Export Report
        </button>
      </div>

      {/* 2. Class Selector panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/50">
        <div className="flex items-center gap-4 sm:w-80">
          <div className="relative flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter Classroom</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <School className="h-4.5 w-4.5" />
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              >
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregating records...</p>
        </div>
      ) : stats.length > 0 ? (
        <div className="space-y-6">
          {/* 3. Recharts Visual Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Student Comparison Analytics</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderColor: '#e2e8f0', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                    }} 
                  />
                  <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '75% Cutoff', fill: '#f43f5e', fontSize: 10, fontWeight: 700, position: 'insideBottomRight' }} />
                  <Bar dataKey="Percentage" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={45} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Roster Report Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Student</th>
                    <th className="py-4 px-6 text-center">Total School Days</th>
                    <th className="py-4 px-6 text-center">Present Days</th>
                    <th className="py-4 px-6 text-center">Absent Days</th>
                    <th className="py-4 px-6 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {stats.map((row) => {
                    const initials = row.student.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    
                    const isBelowCutoff = row.percentage < 75;

                    return (
                      <tr key={row.student.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Student Name */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">{row.student.full_name}</span>
                                {isBelowCutoff && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-100 animate-pulse">
                                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                                    At Risk (&lt;75%)
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold">{row.student.roll_number}</p>
                            </div>
                          </div>
                        </td>

                        {/* Total Days */}
                        <td className="py-3 px-6 text-center text-slate-600 font-semibold">{row.totalDays} days</td>

                        {/* Present Days */}
                        <td className="py-3 px-6 text-center text-emerald-600 font-bold">{row.presentDays} days</td>

                        {/* Absent Days */}
                        <td className="py-3 px-6 text-center text-rose-600 font-bold">{row.absentDays} days</td>

                        {/* Percentage */}
                        <td className="py-3 px-6 text-right font-bold text-slate-800">{row.percentage}%</td>
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
            We couldn't locate any historical attendance logs registered under this class. Navigate to the Attendance Ledger to log sheets first.
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  School, 
  Loader2, 
  CheckSquare, 
  XSquare, 
  Save, 
  User, 
  UserCheck, 
  UserX,
  Sparkles,
  CheckCircle2,
  Inbox
} from 'lucide-react';
import { getAttendanceByDateAndClass, saveAttendanceBatch } from '../../services/db';
import type { Student, AttendanceStatus } from '../../types';

export default function AttendanceContent() {
  const [selectedClass, setSelectedClass] = useState('Grade 10');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [records, setRecords] = useState<{ student: Student; status: AttendanceStatus | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch student roster and attendance status
  const fetchRoster = async () => {
    if (!selectedClass || selectedClass === 'All') return;
    setLoading(true);
    setNotification(null);
    try {
      const data = await getAttendanceByDateAndClass(selectedDate, selectedClass);
      // Map to local component state (stripping supabase internal ids)
      const mapped = data.map((item) => ({
        student: item.student,
        status: item.status || 'Present', // Default to Present to save teachers time!
      }));
      setRecords(mapped);
    } catch (err) {
      console.error('Error fetching attendance roster:', err);
      setNotification({ type: 'error', message: 'Failed to fetch class roster.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [selectedClass, selectedDate]);

  // Toggle state of a student
  const handleToggleStatus = (index: number, newStatus: AttendanceStatus) => {
    const updated = [...records];
    updated[index].status = newStatus;
    setRecords(updated);
  };

  // Helper shortcuts to mark everyone
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = records.map((r) => ({ ...r, status }));
    setRecords(updated);
  };

  // Submit to Supabase DB
  const handleSave = async () => {
    if (records.length === 0) return;
    setSaving(true);
    setNotification(null);

    // Create the batch payload
    const batchPayload = records.map((record) => ({
      student_id: record.student.id,
      attendance_date: selectedDate,
      status: record.status || 'Present',
    }));

    try {
      await saveAttendanceBatch(batchPayload);
      setNotification({ type: 'success', message: 'Attendance sheet submitted successfully!' });
      // Clear notification after 4 seconds
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Error submitting attendance batch:', err);
      setNotification({ type: 'error', message: 'Failed to save attendance logs.' });
    } finally {
      setSaving(false);
    }
  };

  const classes = ['Grade 10', 'Grade 11', 'Grade 12', 'B.Sc CS', 'BCA', 'MCA'];

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Ledger</h1>
          <p className="text-sm font-medium text-slate-500">Track daily student check-ins and absences.</p>
        </div>
      </div>

      {/* 2. Controls Grid */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/50 sm:grid-cols-12 sm:items-center">
        {/* Class Filter */}
        <div className="relative sm:col-span-5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Classroom</label>
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

        {/* Date Selector */}
        <div className="relative sm:col-span-4">
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

        {/* Bulk Action Buttons */}
        <div className="flex gap-2 pt-5 sm:col-span-3 sm:pt-0 sm:justify-end">
          <button
            onClick={() => handleMarkAll('Present')}
            disabled={loading || records.length === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 sm:flex-initial"
            title="Mark All Present"
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            All Present
          </button>
          <button
            onClick={() => handleMarkAll('Absent')}
            disabled={loading || records.length === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 sm:flex-initial"
            title="Mark All Absent"
          >
            <UserX className="h-4 w-4 text-rose-600" />
            All Absent
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div 
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 3. Students Attendance Checklist Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Constructing roll-call roster...</p>
          </div>
        ) : records.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Student</th>
                    <th className="py-4 px-6">Roll Number</th>
                    <th className="py-4 px-6 text-center">Status Marker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {records.map((record, index) => {
                    const initials = record.student.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={record.student.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name Info */}
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600">
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-700">{record.student.full_name}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">{record.student.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Roll Number */}
                        <td className="py-3 px-6 text-slate-500 font-mono font-medium">{record.student.roll_number}</td>

                        {/* Attendance Toggle Selector */}
                        <td className="py-3 px-6 text-center">
                          <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            {/* Present Selector Button */}
                            <button
                              onClick={() => handleToggleStatus(index, 'Present')}
                              className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
                                record.status === 'Present'
                                  ? 'bg-white text-emerald-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Present
                            </button>

                            {/* Absent Selector Button */}
                            <button
                              onClick={() => handleToggleStatus(index, 'Absent')}
                              className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-150 ${
                                record.status === 'Absent'
                                  ? 'bg-white text-rose-600 shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit Action Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Double check exceptions before saving
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Submitting Sheet...
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5" />
                    Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-md font-bold text-slate-700">Empty Classroom</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400 font-semibold">
              We couldn't locate any student files registered inside this specific classroom. Register students first in the Student Directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

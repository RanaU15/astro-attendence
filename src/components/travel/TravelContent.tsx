import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Loader2, 
  MapPin, 
  Image as ImageIcon,
  Compass,
  AlertCircle,
  Inbox,
  Clock,
  Sparkles,
  Award,
  Footprints,
  Info
} from 'lucide-react';
import { getAllEmployees } from '../../services/employeeService';
import { getTravelSessionsByDate } from '../../services/travelService';
import { getLatestActiveDate } from '../../services/db';
import type { Employee } from '../../types';
import type { JoinedTravelSession } from '../../services/travelService';

export default function TravelContent() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [travelSessions, setTravelSessions] = useState<JoinedTravelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-discover the latest active date containing travel records
  useEffect(() => {
    async function initializeDate() {
      console.log('[DEBUG] Travel tracker initializing...');
      try {
        const latest = await getLatestActiveDate();
        console.log('[DEBUG] Auto-detected latest date for travel ledger:', latest);
        setSelectedDate(latest);
      } catch (err) {
        console.warn('[DEBUG] Error during travel date auto-discovery, using today:', err);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
    }
    initializeDate();
  }, []);

  const fetchTravelLogs = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);
    console.log(`[DEBUG] Querying travel ledger for date: ${selectedDate}`);
    try {
      const [empList, sessions] = await Promise.all([
        getAllEmployees(),
        getTravelSessionsByDate(selectedDate)
      ]);
      console.log(`[DEBUG] Fetched ${empList.length} employees and ${sessions.length} travel sessions.`);
      setEmployees(empList);
      setTravelSessions(sessions);
    } catch (err: any) {
      console.error('[DEBUG] Error fetching travel ledger:', err);
      setError('Failed to fetch travel sessions. Please verify database configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTravelLogs();
  }, [selectedDate]);

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Building Travel Ledgers...</p>
      </div>
    );
  }

  // Map employees to their travel sessions for this date
  const employeeTravelRoster = employees.map(emp => {
    // Resilient matching strategy: check if the session's employee_id matches either the employee's ID (int) or employee_id (code)
    const sessions = travelSessions.filter(session => 
      String(session.employee_id) === String(emp.id) || 
      String(session.employee_id) === String(emp.employee_id)
    );

    return {
      employee: emp,
      sessions
    };
  });

  console.log('[DEBUG] Compiled travel roster entries:', employeeTravelRoster);

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Travel Tracker Ledger</h1>
          <p className="text-sm font-medium text-slate-500">Audit daily field travel routes, landmark photos, and GPS mileage.</p>
        </div>
      </div>

      {/* 2. Controls / Date Filters */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/50 sm:grid-cols-12 sm:items-center">
        {/* Date Selector */}
        <div className="relative sm:col-span-6">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Travel Audit Date</label>
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

        {/* Info Indicator */}
        <div className="sm:col-span-6 flex items-center gap-2 bg-amber-50/50 rounded-xl p-3 text-xs font-bold text-amber-800 border border-amber-50">
          <Compass className="h-4.5 w-4.5 shrink-0 text-amber-500" />
          <span>Real-time GPS mileage calculations correspond to active phone tracking coordinates.</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Main Travel Ledger */}
      <div className="space-y-6">
        {employeeTravelRoster.some(row => row.sessions.length > 0) ? (
          employeeTravelRoster
            .filter(row => row.sessions.length > 0)
            .map(({ employee, sessions }) => {
              const initials = employee.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div 
                  key={employee.id} 
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50"
                >
                  {/* Top Employee Banner */}
                  <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                        {initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{employee.name}</h3>
                        <p className="text-xs text-slate-400 font-semibold">Employee ID: {employee.employee_id} • {employee.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                        <Footprints className="h-3.5 w-3.5" />
                        {sessions.length} {sessions.length === 1 ? 'journey' : 'journeys'} logged
                      </span>
                    </div>
                  </div>

                  {/* Sessions Roster for this Employee */}
                  <div className="divide-y divide-slate-100">
                    {sessions.map((session, idx) => {
                      const distanceCovered = session.total_distance 
                        ? `${(session.total_distance / 1000).toFixed(2)} km` 
                        : session.reached_distance 
                        ? `${(session.reached_distance / 1000).toFixed(2)} km` 
                        : '0.00 km';

                      const statusColor = 
                        session.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : session.status === 'reached' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100';

                      return (
                        <div key={session.id} className="p-6 space-y-6 hover:bg-slate-50/20 transition-colors">
                          {/* Session Header */}
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Journey #{idx + 1}</span>
                              <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${statusColor}`}>
                                {session.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Started: {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center gap-1 text-indigo-600">
                                <Award className="h-4 w-4" />
                                <span>Distance: {distanceCovered}</span>
                              </div>
                            </div>
                          </div>

                          {/* Milestones Horizontal / Vertical Track */}
                          <div className="grid gap-4 md:grid-cols-3">
                            {/* Milestone 1: Start */}
                            <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Start Milestone</span>
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                              <p className="text-xs font-medium text-slate-700 min-h-[40px] leading-relaxed">
                                {session.start_address || 'Calculating start milestone...'}
                              </p>
                              {session.start_lat && session.start_lng && (
                                <div className="text-[9px] font-mono text-slate-400 font-bold">
                                  GPS: {session.start_lat.toFixed(5)}, {session.start_lng.toFixed(5)}
                                </div>
                              )}
                              {session.start_photo_url ? (
                                <a 
                                  href={session.start_photo_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 w-full justify-center rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                                  View Start Photo
                                </a>
                              ) : (
                                <div className="text-center text-[10px] text-slate-400 font-semibold py-1.5 border border-dashed border-slate-100 rounded-lg italic">
                                  No start photo logged
                                </div>
                              )}
                            </div>

                            {/* Milestone 2: Reached */}
                            <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Reached Landmark</span>
                                {session.reached_time && (
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {new Date(session.reached_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-700 min-h-[40px] leading-relaxed">
                                {session.reached_address || 'Landmark location pending...'}
                              </p>
                              {session.reached_lat && session.reached_lng && (
                                <div className="text-[9px] font-mono text-slate-400 font-bold">
                                  GPS: {session.reached_lat.toFixed(5)}, {session.reached_lng.toFixed(5)}
                                </div>
                              )}
                              {session.reached_photo_url ? (
                                <a 
                                  href={session.reached_photo_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 w-full justify-center rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                                  View Reached Photo
                                </a>
                              ) : (
                                <div className="text-center text-[10px] text-slate-400 font-semibold py-1.5 border border-dashed border-slate-100 rounded-lg italic">
                                  No reached photo logged
                                </div>
                              )}
                            </div>

                            {/* Milestone 3: End */}
                            <div className="rounded-xl border border-slate-150 bg-white p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">End Milestone</span>
                                {session.end_time && (
                                  <span className="text-xs text-slate-500 font-semibold">
                                    {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-700 min-h-[40px] leading-relaxed">
                                {session.end_address || 'Awaiting destination completion...'}
                              </p>
                              {session.end_lat && session.end_lng && (
                                <div className="text-[9px] font-mono text-slate-400 font-bold">
                                  GPS: {session.end_lat.toFixed(5)}, {session.end_lng.toFixed(5)}
                                </div>
                              )}
                              {session.end_photo_url ? (
                                <a 
                                  href={session.end_photo_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 w-full justify-center rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                                  View End Photo
                                </a>
                              ) : (
                                <div className="text-center text-[10px] text-slate-400 font-semibold py-1.5 border border-dashed border-slate-100 rounded-lg italic">
                                  No end photo logged
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center border border-slate-200 rounded-2xl bg-white">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-md font-bold text-slate-700">No Journeys Logged</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400 font-semibold">
              We couldn't locate any travel sessions recorded in Supabase for the selected date. Choose a different date from the datepicker.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

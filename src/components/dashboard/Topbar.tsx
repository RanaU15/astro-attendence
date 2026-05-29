import React, { useState, useEffect } from 'react';
import { Menu, X, Bell, Search, User, LogOut, LayoutDashboard, CheckSquare, Users, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { signOutUser } from '../../services/auth';

interface TopbarProps {
  activePath: string;
}

export default function Topbar({ activePath }: TopbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('Admin User');

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    }
    fetchUser();
  }, []);

  const getPageTitle = () => {
    if (activePath.startsWith('/dashboard')) return 'Dashboard Overview';
    if (activePath.startsWith('/attendance')) return 'Attendance Ledger';
    if (activePath.startsWith('/students')) return 'Employee Roster Directory';
    if (activePath.startsWith('/reports')) return 'Reports & Insights';
    return 'Admin Panel';
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/attendance', icon: CheckSquare },
    { name: 'Employees', path: '/students', icon: Users },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
        {/* Dynamic Page Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h2 className="hidden text-lg font-bold text-slate-800 sm:block">{getPageTitle()}</h2>
        </div>

        {/* Search, Notifications & User Info */}
        <div className="flex items-center gap-4">
          {/* Mock Search Bar */}
          <div className="relative hidden w-64 sm:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search student or class..."
              className="w-full rounded-xl border border-slate-200 py-1.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Notifications Button */}
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          {/* User Profile Visual */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">{userEmail}</p>
              <p className="text-[10px] font-medium text-slate-400">School Administrator</p>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="fixed bottom-0 left-0 top-0 flex w-72 flex-col bg-white p-6 shadow-2xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header branding */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">AuraAttend</h1>
                <p className="text-xs text-indigo-600">Admin Control</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePath === item.path || activePath.startsWith(item.path + '/');

                return (
                  <a
                    key={item.name}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </a>
                );
              })}
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto border-t border-slate-100 pt-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React from 'react';
import { LayoutDashboard, Users, CheckSquare, BarChart3, Settings, LogOut, GraduationCap, Compass } from 'lucide-react';
import { signOutUser } from '../../services/auth';

interface SidebarProps {
  activePath: string;
}

export default function Sidebar({ activePath }: SidebarProps) {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', path: '/attendance', icon: CheckSquare },
    { name: 'Travel Tracker', path: '/travel', icon: Compass },
    { name: 'Employees', path: '/students', icon: Users },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    try {
      await signOutUser();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <aside className="fixed bottom-0 left-0 top-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 md:flex md:flex-col">
      {/* Brand Logo Header */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">AuraAttend</h1>
          <p className="text-xs font-medium text-indigo-600">Admin Control</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
          
          return (
            <a
              key={item.name}
              href={item.path}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-50/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.name}
            </a>
          );
        })}
      </nav>

      {/* Sidebar Footer Controls */}
      <div className="mt-auto border-t border-slate-100 pt-4">
        <a
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
        >
          <Settings className="h-5 w-5 text-slate-400" />
          Settings
        </a>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-50/50 hover:text-rose-700"
        >
          <LogOut className="h-5 w-5 text-rose-500" />
          Logout
        </button>
      </div>
    </aside>
  );
}

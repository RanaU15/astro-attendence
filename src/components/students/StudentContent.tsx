import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Inbox,
  Phone
} from 'lucide-react';
import type { Employee } from '../../types';
import { getAllEmployees, deleteEmployee } from '../../services/db';
import StudentForm from './StudentForm'; // Reuses the file but maps to EmployeeForm inside

export default function StudentContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const itemsPerPage = 8;

  const fetchEmployeesList = async () => {
    setLoading(true);
    try {
      const data = await getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  const handleDelete = async (employeeId: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete employee ${name}? This will cascade delete their entire attendance and travel history.`)) {
      try {
        await deleteEmployee(employeeId);
        fetchEmployeesList();
      } catch (err) {
        alert('Failed to delete employee.');
      }
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
    fetchEmployeesList();
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  // Filter employees based on search query and role filter
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'All' || emp.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // Calculate pagination variables
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const roles = ['All', 'Employee', 'Admin'];

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Directory</h1>
          <p className="text-sm font-medium text-slate-500">Register, manage, and edit employee profiles in the APK roster.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* 2. Filters & Searches */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 sm:w-48">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Employee Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Querying employee roster logs...</p>
          </div>
        ) : paginatedEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Employee Code ID</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Contact Number</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedEmployees.map((emp) => {
                  const initials = emp.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name with initials circle */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-700">{emp.name}</span>
                        </div>
                      </td>
                      
                      {/* Employee ID */}
                      <td className="py-3.5 px-6 text-slate-500 font-mono font-medium">{emp.employee_id}</td>
                      
                      {/* Role Badge */}
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          emp.role === 'Admin' 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                            : 'bg-indigo-50/50 text-indigo-600'
                        }`}>
                          <Shield className="h-3.5 w-3.5" />
                          {emp.role || 'Employee'}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-6 text-slate-500 font-medium">{emp.email}</td>

                      {/* Phone */}
                      <td className="py-3.5 px-6 text-slate-500 font-medium">
                        {emp.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {emp.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No number listed</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.employee_id, emp.name)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox className="h-7 w-7" />
            </div>
            <h3 className="text-md font-bold text-slate-700">No Roster Entries Match</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400 font-semibold">
              We couldn't locate any employee records matching your search queries. Try enlisting employees or adjusting filters.
            </p>
          </div>
        )}

        {/* 4. Table Pagination Controls */}
        {!loading && filteredEmployees.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
            <span className="text-xs font-semibold text-slate-400">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Add / Edit Modal Drawer */}
      {isFormOpen && (
        <StudentForm
          employee={editingEmployee}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

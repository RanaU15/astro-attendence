import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight,
  School,
  Inbox
} from 'lucide-react';
import type { Student } from '../../types';
import { getAllStudents, deleteStudent } from '../../services/db';
import StudentForm from './StudentForm';

export default function StudentContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const itemsPerPage = 8;

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you absolutely sure you want to delete ${name}? This will cascade delete their entire attendance history.`)) {
      try {
        await deleteStudent(id);
        fetchStudents();
      } catch (err) {
        alert('Failed to delete student.');
      }
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingStudent(null);
    fetchStudents();
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  // Filter students based on search query and classroom selector
  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = selectedClass === 'All' || student.class_name === selectedClass;

    return matchesSearch && matchesClass;
  });

  // Calculate pagination variables
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  const classes = ['All', 'Grade 10', 'Grade 11', 'Grade 12', 'B.Sc CS', 'BCA', 'MCA'];

  return (
    <div className="space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-sm font-medium text-slate-500">Add, manage, and edit student enrollments.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          Add Student
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
            placeholder="Search by name, email, roll number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2 sm:w-48">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          >
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Student Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100/50">
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Querying student logs...</p>
          </div>
        ) : paginatedStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Roll Number</th>
                  <th className="py-4 px-6">Classroom</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedStudents.map((student) => {
                  const initials = student.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name with badge */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600">
                            {initials}
                          </div>
                          <span className="font-semibold text-slate-700">{student.full_name}</span>
                        </div>
                      </td>
                      
                      {/* Roll Number */}
                      <td className="py-3.5 px-6 text-slate-500 font-mono font-medium">{student.roll_number}</td>
                      
                      {/* Class */}
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                          <School className="h-3.5 w-3.5" />
                          {student.class_name}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-6 text-slate-500 font-medium">{student.email}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditClick(student)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id, student.full_name)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete Student"
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
              We couldn't locate any student files aligning with your search metrics. Try adjusting your grade selector or typing custom queries.
            </p>
          </div>
        )}

        {/* 4. Table Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
            <span className="text-xs font-semibold text-slate-400">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
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
          student={editingStudent}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

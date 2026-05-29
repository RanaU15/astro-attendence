import { supabase } from '../lib/supabase';
import type { Employee } from '../types';

/**
 * Fetches all employees from the Supabase database.
 */
export async function getAllEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
  return data || [];
}

/**
 * Fetches a single employee by their custom unique employee_id.
 */
export async function getEmployeeByCode(employeeId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching employee with ID ${employeeId}:`, error);
    throw error;
  }
  return data;
}

/**
 * Adds a new employee record.
 */
export async function addEmployee(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select()
    .single();

  if (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
  return data;
}

/**
 * Updates an existing employee profile.
 */
export async function updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('employee_id', employeeId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating employee ${employeeId}:`, error);
    throw error;
  }
  return data;
}

/**
 * Deletes an employee by their employee_id.
 */
export async function deleteEmployee(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('employee_id', employeeId);

  if (error) {
    console.error(`Error deleting employee ${employeeId}:`, error);
    throw error;
  }
}

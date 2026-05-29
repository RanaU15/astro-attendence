// Central TypeScript Interfaces for Attendance APK Backend

export interface Employee {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: string;
  image_url?: string;
  created_at?: string;
}

export interface AttendanceLog {
  id: number;
  employee_id: string;
  email: string;
  clock_type: string; // 'Login' | 'Logout'
  login_time?: string;
  logout_time?: string;
  break_hours?: number;
  total_hours?: number;
  net_hours?: number;
  location?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  clock_in?: string;
  clock_out?: string;
  created_at: string;
}

export interface TravelSession {
  id: number;
  employee_id: string;
  start_time?: string;
  reached_time?: string;
  end_time?: string;
  start_lat?: number;
  start_lng?: number;
  reached_lat?: number;
  reached_lng?: number;
  end_lat?: number;
  end_lng?: number;
  start_photo_url?: string;
  reached_photo_url?: string;
  end_photo_url?: string;
  start_address?: string;
  reached_address?: string;
  end_address?: string;
  reached_distance?: number;
  total_distance?: number;
  status: 'active' | 'reached' | 'completed';
  created_at: string;
}

// Unified UI Metrics
export interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  totalTravelToday: number;
  totalAttendanceToday: number;
}

export interface WeeklyActivityTrend {
  date: string; // E.g., "Mon", "Tue"
  Logins: number;
  Travels: number;
}

export interface DepartmentSummary {
  department: string; // E.g., "Sales", "Delivery", "Engineering"
  total: number;
  active: number;
  percentage: number;
}

export interface EmployeeAttendanceStats {
  employee: Employee;
  totalDays: number;
  presentDays: number;
  percentage: number;
}

-- ==========================================
-- SUPABASE POSTGRESQL SCHEMA SETUP
-- Project: Attendance Management System
-- ==========================================

-- 1. CLEANUP (Optional - Use if resetting database)
-- DROP TABLE IF EXISTS attendance;
-- DROP TABLE IF EXISTS students;

-- 2. CREATE STUDENTS TABLE
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    roll_number VARCHAR(100) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. CREATE ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE DEFAULT CURRENT_DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Present', 'Absent')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Ensure each student can only have ONE attendance status marked per day
    CONSTRAINT unique_student_date UNIQUE (student_id, attendance_date)
);

-- 4. OPTIMIZATION INDEXES FOR RAPID SEARCH
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, attendance_date);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- Enables strict access control policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES (Allow all actions to Authenticated Users)
-- Since only authenticated administrators should manage attendance, we restrict all operations
-- to authenticated Supabase accounts.

-- Students Policies
CREATE POLICY "Allow authenticated users select on students"
    ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users insert on students"
    ON students FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users update on students"
    ON students FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users delete on students"
    ON students FOR DELETE TO authenticated USING (true);

-- Attendance Policies
CREATE POLICY "Allow authenticated users select on attendance"
    ON attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users insert on attendance"
    ON attendance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users update on attendance"
    ON attendance FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users delete on attendance"
    ON attendance FOR DELETE TO authenticated USING (true);

-- 7. SEED INITIAL STUDENTS DATA (Optional for testing)
-- INSERT INTO students (full_name, email, roll_number, class_name) VALUES
-- ('John Doe', 'john.doe@school.com', 'ROLL-001', 'Grade 10'),
-- ('Jane Smith', 'jane.smith@school.com', 'ROLL-002', 'Grade 10'),
-- ('Alice Johnson', 'alice.j@school.com', 'ROLL-003', 'Grade 11');

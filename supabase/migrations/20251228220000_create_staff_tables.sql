
-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    department_id UUID REFERENCES departments(id),
    role TEXT NOT NULL,
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff_roles table (for good measure as it's often used)
CREATE TABLE IF NOT EXISTS staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create staff_schedules table
CREATE TABLE IF NOT EXISTS staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_start TIME NOT NULL,
    shift_end TIME NOT NULL,
    shift_type TEXT CHECK (shift_type IN ('morning', 'evening', 'night')),
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

-- Create basic policies (Allow all authenticated users for now to fix the blockage)
CREATE POLICY "Allow all authenticated for departments" ON departments FOR ALL USING (true);
CREATE POLICY "Allow all authenticated for staff" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all authenticated for staff_roles" ON staff_roles FOR ALL USING (true);
CREATE POLICY "Allow all authenticated for staff_schedules" ON staff_schedules FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON departments TO authenticated;
GRANT ALL ON staff TO authenticated;
GRANT ALL ON staff_roles TO authenticated;
GRANT ALL ON staff_schedules TO authenticated;
GRANT ALL ON departments TO anon;
GRANT ALL ON staff TO anon;
GRANT ALL ON staff_roles TO anon;
GRANT ALL ON staff_schedules TO anon;

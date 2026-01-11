-- Add soft delete support for staff table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.staff
      ADD COLUMN deleted_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_staff_deleted_at
      ON public.staff(deleted_at);
  END IF;
END $$;

-- Create staff_attendance table for tracking daily attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    time_in TIME,
    time_out TIME,
    status TEXT CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday')) DEFAULT 'present',
    attendance_type TEXT CHECK (attendance_type IN ('manual', 'biometric', 'system')) DEFAULT 'manual',
    notes TEXT,
    marked_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, attendance_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_id ON public.staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON public.staff_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_status ON public.staff_attendance(status);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date ON public.staff_attendance(staff_id, attendance_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_staff_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_attendance_updated_at_trigger ON public.staff_attendance;
CREATE TRIGGER update_staff_attendance_updated_at_trigger
    BEFORE UPDATE ON public.staff_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_attendance_updated_at();

-- Add RLS policies for staff_attendance
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view attendance
CREATE POLICY "Users can view staff attendance" ON public.staff_attendance
  FOR SELECT USING (auth.role() = 'authenticated');


-- Policy to allow admins and managers to insert/update attendance
CREATE POLICY "Admins can manage attendance" ON public.staff_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'md', 'chief_doctor')
    )
  );

-- Create staff_attendance_summary view for quick reporting
CREATE OR REPLACE VIEW public.staff_attendance_summary AS
SELECT 
    s.id as staff_id,
    CONCAT(s.first_name, ' ', s.last_name) as staff_name,
    s.role,
    d.name as department,
    sa.attendance_date,
    sa.time_in,
    sa.time_out,
    sa.status,
    sa.attendance_type,
    sa.notes,
    CASE 
        WHEN sa.time_in IS NOT NULL AND sa.time_out IS NOT NULL 
        THEN sa.time_out - sa.time_in
        ELSE NULL
    END as total_hours,
    sa.marked_by,
    u.name as marked_by_name,
    sa.created_at,
    sa.updated_at
FROM public.staff s
LEFT JOIN public.staff_attendance sa ON s.id = sa.staff_id
LEFT JOIN public.departments d ON s.department_id = d.id
LEFT JOIN public.users u ON sa.marked_by = u.id
WHERE s.deleted_at IS NULL
ORDER BY sa.attendance_date DESC, s.first_name;

-- Grant permissions on the view
GRANT SELECT ON public.staff_attendance_summary TO authenticated;

COMMENT ON TABLE public.staff_attendance IS 'Tracks daily attendance with time in/out for staff members';
COMMENT ON COLUMN public.staff_attendance.time_in IS 'Time when staff member checked in';
COMMENT ON COLUMN public.staff_attendance.time_out IS 'Time when staff member checked out';
COMMENT ON COLUMN public.staff_attendance.status IS 'Attendance status: present, absent, half_day, leave, holiday';
COMMENT ON COLUMN public.staff_attendance.attendance_type IS 'How attendance was marked: manual, biometric, system';
COMMENT ON COLUMN public.staff_attendance.marked_by IS 'User who marked the attendance';

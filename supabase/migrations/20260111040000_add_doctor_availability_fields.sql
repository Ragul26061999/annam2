-- Add availability fields to doctors table

DO $$
BEGIN
  -- Add availability_type column with proper enum constraint
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'availability_type'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN availability_type TEXT CHECK (availability_type IN ('session_based', 'on_call')) DEFAULT 'session_based';

    CREATE INDEX IF NOT EXISTS idx_doctors_availability_type
      ON public.doctors(availability_type);
  END IF;

  -- Add availability_hours JSONB column for session details
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'availability_hours'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN availability_hours JSONB;

    CREATE INDEX IF NOT EXISTS idx_doctors_availability_hours
      ON public.doctors USING GIN(availability_hours);
  END IF;

  -- Add consultation_fee column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'consultation_fee'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN consultation_fee NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  -- Add room_number column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'room_number'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN room_number TEXT;
  END IF;

  -- Add years_of_experience column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'years_of_experience'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN years_of_experience INTEGER DEFAULT 0;
  END IF;

  -- Add qualification column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'qualification'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN qualification TEXT;
  END IF;

  -- Add user_id foreign key reference
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN user_id UUID REFERENCES auth.users(id);

    CREATE INDEX IF NOT EXISTS idx_doctors_user_id
      ON public.doctors(user_id);
  END IF;

  -- Update existing doctors to have default availability_hours structure
  UPDATE public.doctors 
  SET availability_hours = '{
    "sessions": {
      "morning": {"startTime": "09:00", "endTime": "12:00"},
      "afternoon": {"startTime": "14:00", "endTime": "17:00"},
      "evening": {"startTime": "18:00", "endTime": "21:00"}
    },
    "availableSessions": ["morning", "afternoon"],
    "workingDays": [1, 2, 3, 4, 5],
    "emergencyAvailable": false
  }'::jsonb
  WHERE availability_hours IS NULL;

END $$;

-- Add RLS policies for availability fields
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view doctor availability
CREATE POLICY "Users can view doctor availability" ON public.doctors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow doctors to update their own availability
CREATE POLICY "Doctors can update own availability" ON public.doctors
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Policy to allow staff to update doctor availability
CREATE POLICY "Staff can update doctor availability" ON public.doctors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE auth.uid() = user_id 
      AND role IN ('admin', 'doctor', 'nurse')
    )
  );

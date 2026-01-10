-- Add soft delete support for doctors

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.doctors
      ADD COLUMN deleted_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_doctors_deleted_at
      ON public.doctors(deleted_at);
  END IF;
END $$;

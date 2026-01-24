ALTER TABLE public.diagnostic_groups
  ADD COLUMN IF NOT EXISTS service_types text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill for existing rows (best-effort)
UPDATE public.diagnostic_groups
SET service_types = CASE
  WHEN lower(category) = 'lab' THEN ARRAY['lab']::text[]
  WHEN lower(category) = 'radiology' THEN ARRAY['radiology','xray']::text[]
  WHEN lower(category) = 'scan' THEN ARRAY['scan']::text[]
  WHEN lower(category) = 'mixed' THEN ARRAY['lab','radiology','scan','xray']::text[]
  ELSE service_types
END
WHERE service_types = ARRAY[]::text[];

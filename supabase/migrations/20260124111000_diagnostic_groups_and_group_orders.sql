-- Diagnostic groups (templates) maintained by lab/diagnostic staff

CREATE TABLE IF NOT EXISTS public.diagnostic_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Lab',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_groups_is_active ON public.diagnostic_groups(is_active);

CREATE TABLE IF NOT EXISTS public.diagnostic_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.diagnostic_groups(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type in ('lab','radiology','scan','xray')),
  catalog_id uuid NOT NULL,
  default_selected boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_group_items_group_id ON public.diagnostic_group_items(group_id);

-- Group order (single-row order prescribed by doctor)
CREATE TABLE IF NOT EXISTS public.diagnostic_group_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.diagnostic_groups(id),
  group_name_snapshot text NOT NULL,

  patient_id uuid NOT NULL REFERENCES public.patients(id),
  encounter_id uuid NULL REFERENCES public.encounter(id),
  appointment_id uuid NULL REFERENCES public.appointment(id),

  ordering_doctor_id uuid NULL REFERENCES public.doctors(id),
  clinical_indication text NULL,
  urgency text NULL DEFAULT 'routine',

  status text NOT NULL DEFAULT 'ordered',
  is_ip boolean NOT NULL DEFAULT false,
  bed_allocation_id uuid NULL REFERENCES public.bed_allocations(id),

  billing_id uuid NULL REFERENCES public.billing(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_group_orders_patient_id ON public.diagnostic_group_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_group_orders_encounter_id ON public.diagnostic_group_orders(encounter_id);

-- Items inside the group order (selected/unselected, result links, and mapping to underlying legacy order rows)
CREATE TABLE IF NOT EXISTS public.diagnostic_group_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id uuid NOT NULL REFERENCES public.diagnostic_group_orders(id) ON DELETE CASCADE,

  service_type text NOT NULL CHECK (service_type in ('lab','radiology','scan','xray')),
  catalog_id uuid NOT NULL,
  item_name_snapshot text NOT NULL,

  selected boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ordered',

  legacy_lab_test_order_id uuid NULL REFERENCES public.lab_test_orders(id),
  legacy_radiology_test_order_id uuid NULL REFERENCES public.radiology_test_orders(id),
  legacy_scan_order_id uuid NULL REFERENCES public.scan_orders(id),
  legacy_xray_order_id uuid NULL REFERENCES public.xray_orders(id),

  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_group_order_items_group_order_id ON public.diagnostic_group_order_items(group_order_id);

-- Link existing order tables back to the group order (compatibility mode)
ALTER TABLE public.lab_test_orders
  ADD COLUMN IF NOT EXISTS diagnostic_group_order_id uuid NULL REFERENCES public.diagnostic_group_orders(id);

ALTER TABLE public.radiology_test_orders
  ADD COLUMN IF NOT EXISTS diagnostic_group_order_id uuid NULL REFERENCES public.diagnostic_group_orders(id);

ALTER TABLE public.scan_orders
  ADD COLUMN IF NOT EXISTS diagnostic_group_order_id uuid NULL REFERENCES public.diagnostic_group_orders(id);

ALTER TABLE public.xray_orders
  ADD COLUMN IF NOT EXISTS diagnostic_group_order_id uuid NULL REFERENCES public.diagnostic_group_orders(id);

CREATE INDEX IF NOT EXISTS idx_lab_test_orders_diagnostic_group_order_id ON public.lab_test_orders(diagnostic_group_order_id);
CREATE INDEX IF NOT EXISTS idx_radiology_test_orders_diagnostic_group_order_id ON public.radiology_test_orders(diagnostic_group_order_id);
CREATE INDEX IF NOT EXISTS idx_scan_orders_diagnostic_group_order_id ON public.scan_orders(diagnostic_group_order_id);
CREATE INDEX IF NOT EXISTS idx_xray_orders_diagnostic_group_order_id ON public.xray_orders(diagnostic_group_order_id);

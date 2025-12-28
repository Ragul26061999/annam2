
-- Add a staff_id column to track which staff member created/handled the record
-- We use IF NOT EXISTS to avoid errors if run multiple times

-- 1. Patients Table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'staff_id') THEN
        ALTER TABLE public.patients ADD COLUMN staff_id UUID REFERENCES public.staff(id);
    END IF;
END $$;

-- 2. Bed Allocations Table (Inpatient)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bed_allocations' AND column_name = 'staff_id') THEN
        ALTER TABLE public.bed_allocations ADD COLUMN staff_id UUID REFERENCES public.staff(id);
    END IF;
END $$;

-- 3. Billing Table (Pharmacy/General)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing' AND column_name = 'staff_id') THEN
        ALTER TABLE public.billing ADD COLUMN staff_id UUID REFERENCES public.staff(id);
    END IF;
END $$;

-- 4. Lab Test Orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lab_test_orders' AND column_name = 'staff_id') THEN
        ALTER TABLE public.lab_test_orders ADD COLUMN staff_id UUID REFERENCES public.staff(id);
    END IF;
END $$;

-- 5. Radiology Test Orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'radiology_test_orders' AND column_name = 'staff_id') THEN
        ALTER TABLE public.radiology_test_orders ADD COLUMN staff_id UUID REFERENCES public.staff(id);
    END IF;
END $$;

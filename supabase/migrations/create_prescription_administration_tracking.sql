-- Prescription Administration Tracking
-- This migration creates tables for tracking prescription administration by nurses

-- 1. IP Prescription Administration Schedule Table
-- Stores scheduled medication administrations for IP patients
CREATE TABLE IF NOT EXISTS ip_prescription_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    prescription_item_id UUID NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    -- Medication details (denormalized for easy access)
    medication_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency_times TEXT[], -- ['Morning', 'Afternoon', 'Evening', 'Night']
    meal_timing VARCHAR(50), -- before_meal, after_meal, with_meal, empty_stomach
    instructions TEXT,
    
    -- Schedule details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. IP Prescription Administration Log Table
-- Stores actual administration records for each scheduled dose
CREATE TABLE IF NOT EXISTS ip_prescription_administration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES ip_prescription_schedule(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id),
    
    -- Administration details
    administration_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL CHECK (time_slot IN ('Morning', 'Afternoon', 'Evening', 'Night')),
    scheduled_time TIME NOT NULL, -- Default time for each slot: Morning=08:00, Afternoon=12:00, Evening=17:00, Night=21:00
    
    -- Administration status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'administered', 'skipped', 'refused', 'delayed')),
    administered_at TIMESTAMP WITH TIME ZONE,
    administered_by UUID REFERENCES staff(id),
    
    -- Administration details
    actual_dosage VARCHAR(100),
    notes TEXT,
    refusal_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Nurse Medication Checklist View
-- This is a materialized view for efficient nurse checklist display
CREATE MATERIALIZED VIEW IF NOT EXISTS nurse_medication_checklist AS
SELECT 
    ps.id as schedule_id,
    ps.patient_id,
    ps.bed_allocation_id,
    ps.medication_name,
    ps.dosage,
    ps.frequency_times,
    ps.meal_timing,
    ps.instructions,
    ps.start_date,
    ps.end_date,
    ps.total_days,
    ps.status as prescription_status,
    
    -- Generate administration records for each day and time slot
    generate_series(
        ps.start_date, 
        ps.end_date, 
        '1 day'::interval
    )::date as administration_date,
    
    unnest(ps.frequency_times) as time_slot,
    
    -- Case statement for scheduled times
    CASE 
        WHEN unnest(ps.frequency_times) = 'Morning' THEN '08:00:00'::time
        WHEN unnest(ps.frequency_times) = 'Afternoon' THEN '12:00:00'::time
        WHEN unnest(ps.frequency_times) = 'Evening' THEN '17:00:00'::time
        WHEN unnest(ps.frequency_times) = 'Night' THEN '21:00:00'::time
    END as scheduled_time,
    
    -- Check if administration record exists
    COALESCE(
        (SELECT status FROM ip_prescription_administration ipa 
         WHERE ipa.schedule_id = ps.id 
         AND ipa.administration_date = generate_series(ps.start_date, ps.end_date, '1 day'::interval)::date
         AND ipa.time_slot = unnest(ps.frequency_times)
         LIMIT 1),
        'pending'
    ) as administration_status,
    
    -- Get administration details if exists
    (SELECT administered_at FROM ip_prescription_administration ipa 
     WHERE ipa.schedule_id = ps.id 
     AND ipa.administration_date = generate_series(ps.start_date, ps.end_date, '1 day'::interval)::date
     AND ipa.time_slot = unnest(ps.frequency_times)
     LIMIT 1) as administered_at,
     
    (SELECT notes FROM ip_prescription_administration ipa 
     WHERE ipa.schedule_id = ps.id 
     AND ipa.administration_date = generate_series(ps.start_date, ps.end_date, '1 day'::interval)::date
     AND ipa.time_slot = unnest(ps.frequency_times)
     LIMIT 1) as administration_notes,
     
    -- Patient and allocation info
    p.uhid as patient_uhid,
    p.first_name || ' ' || p.last_name as patient_name,
    ba.ip_number,
    
    -- Sort key for ordering
    (generate_series(ps.start_date, ps.end_date, '1 day'::interval)::date - ps.start_date) + 1 as day_number

FROM ip_prescription_schedule ps
JOIN patients p ON ps.patient_id = p.id
JOIN bed_allocations ba ON ps.bed_allocation_id = ba.id
WHERE ps.status = 'active';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ip_prescription_schedule_allocation ON ip_prescription_schedule(bed_allocation_id);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_schedule_patient ON ip_prescription_schedule(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_schedule_prescription ON ip_prescription_schedule(prescription_id);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_schedule_dates ON ip_prescription_schedule(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_schedule_status ON ip_prescription_schedule(status);

CREATE INDEX IF NOT EXISTS idx_ip_prescription_administration_schedule ON ip_prescription_administration(schedule_id);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_administration_patient ON ip_prescription_administration(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_administration_date_time ON ip_prescription_administration(administration_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_ip_prescription_administration_status ON ip_prescription_administration(status);

-- Create unique index to prevent duplicate administrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_prescription_administration_unique 
ON ip_prescription_administration(schedule_id, administration_date, time_slot);

-- Create indexes for the materialized view
CREATE INDEX IF NOT EXISTS idx_nurse_medication_checklist_patient_date ON nurse_medication_checklist(patient_id, administration_date);
CREATE INDEX IF NOT EXISTS idx_nurse_medication_checklist_allocation_date ON nurse_medication_checklist(bed_allocation_id, administration_date);
CREATE INDEX IF NOT EXISTS idx_nurse_medication_checklist_date_status ON nurse_medication_checklist(administration_date, administration_status);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_nurse_medication_checklist()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY nurse_medication_checklist;
END;
$$ LANGUAGE plpgsql;

-- Function to create prescription schedule from prescription
CREATE OR REPLACE FUNCTION create_prescription_schedule(
    p_bed_allocation_id UUID,
    p_prescription_id UUID,
    p_patient_id UUID
)
RETURNS void AS $$
DECLARE
    prescription_item RECORD;
    schedule_id UUID;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Get bed allocation admission date
    SELECT admission_date::DATE INTO start_date 
    FROM bed_allocations 
    WHERE id = p_bed_allocation_id;
    
    -- Loop through each prescription item
    FOR prescription_item IN 
        SELECT 
            pi.id as prescription_item_id,
            pi.medication_id,
            m.name as medication_name,
            pi.dosage,
            pi.frequency,
            pi.duration,
            pi.instructions,
            -- Extract frequency times from frequency text
            CASE 
                WHEN pi.frequency LIKE '%Morning%' THEN ARRAY['Morning']
                WHEN pi.frequency LIKE '%Afternoon%' THEN ARRAY['Afternoon']  
                WHEN pi.frequency LIKE '%Evening%' THEN ARRAY['Evening']
                WHEN pi.frequency LIKE '%Night%' THEN ARRAY['Night']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Afternoon%' THEN ARRAY['Morning', 'Afternoon']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Evening%' THEN ARRAY['Morning', 'Evening']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Morning', 'Night']
                WHEN pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Evening%' THEN ARRAY['Afternoon', 'Evening']
                WHEN pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Afternoon', 'Night']
                WHEN pi.frequency LIKE '%Evening%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Evening', 'Night']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Evening%' THEN ARRAY['Morning', 'Afternoon', 'Evening']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Morning', 'Afternoon', 'Night']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Evening%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Morning', 'Evening', 'Night']
                WHEN pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Evening%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Afternoon', 'Evening', 'Night']
                WHEN pi.frequency LIKE '%Morning%' AND pi.frequency LIKE '%Afternoon%' AND pi.frequency LIKE '%Evening%' AND pi.frequency LIKE '%Night%' THEN ARRAY['Morning', 'Afternoon', 'Evening', 'Night']
                ELSE ARRAY['Morning'] -- Default
            END as frequency_times,
            -- Extract meal timing
            CASE 
                WHEN pi.instructions LIKE '%before meal%' THEN 'before_meal'
                WHEN pi.instructions LIKE '%after meal%' THEN 'after_meal'
                WHEN pi.instructions LIKE '%with meal%' THEN 'with_meal'
                WHEN pi.instructions LIKE '%empty stomach%' THEN 'empty_stomach'
                ELSE NULL
            END as meal_timing,
            -- Extract duration in days
            CASE 
                WHEN pi.duration ~ '[0-9]+ days?' THEN CAST(REGEXP_REPLACE(pi.duration, '.*([0-9]+) days?.*', '\1') AS INTEGER)
                WHEN pi.duration ~ '[0-9]+ day' THEN CAST(REGEXP_REPLACE(pi.duration, '.*([0-9]+) day.*', '\1') AS INTEGER)
                ELSE 7 -- Default 7 days
            END as duration_days
        FROM prescription_items pi
        JOIN medications m ON pi.medication_id = m.id
        WHERE pi.prescription_id = p_prescription_id
    LOOP
        -- Calculate end date
        end_date := start_date + (prescription_item.duration_days - 1) * INTERVAL '1 day';
        
        -- Insert schedule record
        INSERT INTO ip_prescription_schedule (
            bed_allocation_id,
            prescription_id,
            prescription_item_id,
            patient_id,
            medication_name,
            dosage,
            frequency_times,
            meal_timing,
            instructions,
            start_date,
            end_date,
            total_days
        ) VALUES (
            p_bed_allocation_id,
            p_prescription_id,
            prescription_item.prescription_item_id,
            p_patient_id,
            prescription_item.medication_name,
            prescription_item.dosage,
            prescription_item.frequency_times,
            prescription_item.meal_timing,
            prescription_item.instructions,
            start_date,
            end_date,
            prescription_item.duration_days
        );
    END LOOP;
    
    -- Refresh the materialized view
    PERFORM refresh_nurse_medication_checklist();
END;
$$ LANGUAGE plpgsql;

-- Function to administer medication
CREATE OR REPLACE FUNCTION administer_medication(
    p_schedule_id UUID,
    p_administration_date DATE,
    p_time_slot VARCHAR(20),
    p_administered_by UUID,
    p_status VARCHAR(20) DEFAULT 'administered',
    p_notes TEXT DEFAULT NULL,
    p_actual_dosage VARCHAR(100) DEFAULT NULL,
    p_refusal_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO ip_prescription_administration (
        schedule_id,
        patient_id,
        bed_allocation_id,
        administration_date,
        time_slot,
        scheduled_time,
        status,
        administered_at,
        administered_by,
        actual_dosage,
        notes,
        refusal_reason
    )
    SELECT 
        p_schedule_id,
        patient_id,
        bed_allocation_id,
        p_administration_date,
        p_time_slot,
        CASE 
            WHEN p_time_slot = 'Morning' THEN '08:00:00'::time
            WHEN p_time_slot = 'Afternoon' THEN '12:00:00'::time
            WHEN p_time_slot = 'Evening' THEN '17:00:00'::time
            WHEN p_time_slot = 'Night' THEN '21:00:00'::time
        END,
        p_status,
        CASE WHEN p_status = 'administered' THEN NOW() ELSE NULL END,
        p_administered_by,
        p_actual_dosage,
        p_notes,
        p_refusal_reason
    FROM ip_prescription_schedule
    WHERE id = p_schedule_id;
    
    -- Refresh the materialized view
    PERFORM refresh_nurse_medication_checklist();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ip_prescription_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ip_prescription_administration TO authenticated;
GRANT SELECT ON nurse_medication_checklist TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_nurse_medication_checklist TO authenticated;
GRANT EXECUTE ON FUNCTION create_prescription_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION administer_medication TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE ip_prescription_schedule IS 'Stores medication administration schedules for IP patients';
COMMENT ON TABLE ip_prescription_administration IS 'Stores actual medication administration records';
COMMENT ON MATERIALIZED VIEW nurse_medication_checklist IS 'Materialized view for nurse medication administration checklist';
COMMENT ON FUNCTION create_prescription_schedule IS 'Creates medication administration schedule from prescription';
COMMENT ON FUNCTION administer_medication IS 'Records medication administration by nurse';

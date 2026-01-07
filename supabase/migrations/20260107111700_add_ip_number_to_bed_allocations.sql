ALTER TABLE bed_allocations
ADD COLUMN IF NOT EXISTS ip_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bed_allocations_ip_number_unique
ON bed_allocations (ip_number)
WHERE ip_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bed_allocations_ip_number
ON bed_allocations (ip_number);

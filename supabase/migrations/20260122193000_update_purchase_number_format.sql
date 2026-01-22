-- Update purchase number generation to use PUR-YYMM-XXXX format

CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  seq_val BIGINT;
BEGIN
  -- Get next value from sequence
  seq_val := nextval('purchase_number_seq');
  
  -- Format: PUR-YYMM-XXXX (e.g., PUR-2601-0001)
  -- Uses current date for YYMM part
  new_number := 'PUR-' || to_char(now(), 'YYMM') || '-' || lpad(seq_val::text, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

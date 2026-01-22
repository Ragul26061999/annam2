-- Update purchase number to start from 1500 and auto-increment, and ensure purchases update medicine_batches

-- =====================================================
-- 1) PURCHASE NUMBER SEQUENCE START
-- =====================================================

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS purchase_number_seq;

-- Ensure sequence is at least 1500, and if there are existing numeric purchase_numbers, continue from the max.
DO $$
DECLARE
  v_max_existing BIGINT;
  v_next BIGINT;
BEGIN
  -- Only consider purely numeric purchase numbers (e.g. '1500').
  SELECT MAX(purchase_number::BIGINT)
    INTO v_max_existing
  FROM drug_purchases
  WHERE purchase_number ~ '^[0-9]+$';

  v_next := GREATEST(1500, COALESCE(v_max_existing + 1, 1500));

  -- setval sets the current value; nextval() will return v_next.
  PERFORM setval('purchase_number_seq', v_next - 1, true);
EXCEPTION
  WHEN undefined_table THEN
    -- drug_purchases may not exist yet in some environments.
    PERFORM setval('purchase_number_seq', 1499, true);
END $$;

-- Replace generator to produce a simple numeric purchase number as text
CREATE OR REPLACE FUNCTION generate_purchase_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
BEGIN
  new_number := nextval('purchase_number_seq')::TEXT;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2) MEDICINE BATCH UPSERT ON PURCHASE ITEM INSERT
-- =====================================================

-- Some environments use medication_id vs medicine_id. Ensure medication_id exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medicine_batches'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'medicine_batches' AND column_name = 'medication_id'
    ) THEN
      ALTER TABLE medicine_batches ADD COLUMN medication_id UUID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'medicine_batches' AND column_name = 'purchase_id'
    ) THEN
      ALTER TABLE medicine_batches ADD COLUMN purchase_id UUID;
      BEGIN
        ALTER TABLE medicine_batches
          ADD CONSTRAINT fk_medicine_batches_purchase_id
          FOREIGN KEY (purchase_id) REFERENCES drug_purchases(id);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;

    -- Backfill medication_id from medicine_id if present
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'medicine_batches' AND column_name = 'medicine_id'
    ) THEN
      EXECUTE 'UPDATE medicine_batches SET medication_id = COALESCE(medication_id, medicine_id) WHERE medication_id IS NULL';
    END IF;

    -- Enforce a per-medication batch uniqueness if possible (safe if already exists)
    BEGIN
      ALTER TABLE medicine_batches
        ADD CONSTRAINT uq_medicine_batches_med_batch UNIQUE (medication_id, batch_number);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Replace trigger function to update medication stock AND upsert batch quantities
CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_qty INTEGER;
  v_purchase_price NUMERIC;
  v_selling_price NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_qty := NEW.quantity + COALESCE(NEW.free_quantity, 0);

    -- Support both old and new schemas for price columns
    v_purchase_price := COALESCE(NEW.purchase_rate, NEW.unit_price);
    v_selling_price := COALESCE(NEW.selling_rate, NEW.mrp);

    -- Update medication stock (legacy field)
    UPDATE medications
    SET available_stock = COALESCE(available_stock, 0) + v_qty,
        total_stock = COALESCE(total_stock, 0) + v_qty,
        updated_at = NOW()
    WHERE id = NEW.medication_id;

    -- Upsert into medicine_batches if table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'medicine_batches'
    ) THEN
      -- Prefer ON CONFLICT on (medication_id, batch_number) when available. Fallback to batch_number uniqueness.
      BEGIN
        INSERT INTO medicine_batches (
          purchase_id,
          medication_id,
          batch_number,
          manufacturing_date,
          expiry_date,
          received_date,
          received_quantity,
          current_quantity,
          purchase_price,
          selling_price,
          supplier_id,
          status,
          notes
        ) VALUES (
          NEW.purchase_id,
          NEW.medication_id,
          NEW.batch_number,
          NEW.manufacturing_date,
          NEW.expiry_date,
          (SELECT purchase_date FROM drug_purchases WHERE id = NEW.purchase_id),
          v_qty,
          v_qty,
          v_purchase_price,
          v_selling_price,
          (SELECT supplier_id FROM drug_purchases WHERE id = NEW.purchase_id),
          'active',
          'Auto-created from purchase '
            || (SELECT purchase_number FROM drug_purchases WHERE id = NEW.purchase_id)
        )
        ON CONFLICT (medication_id, batch_number)
        DO UPDATE SET
          purchase_id = COALESCE(medicine_batches.purchase_id, EXCLUDED.purchase_id),
          current_quantity = COALESCE(medicine_batches.current_quantity, 0) + EXCLUDED.current_quantity,
          received_quantity = COALESCE(medicine_batches.received_quantity, 0) + EXCLUDED.received_quantity,
          expiry_date = COALESCE(EXCLUDED.expiry_date, medicine_batches.expiry_date),
          manufacturing_date = COALESCE(EXCLUDED.manufacturing_date, medicine_batches.manufacturing_date),
          purchase_price = COALESCE(EXCLUDED.purchase_price, medicine_batches.purchase_price),
          selling_price = COALESCE(EXCLUDED.selling_price, medicine_batches.selling_price),
          supplier_id = COALESCE(EXCLUDED.supplier_id, medicine_batches.supplier_id),
          received_date = COALESCE(EXCLUDED.received_date, medicine_batches.received_date),
          status = COALESCE(EXCLUDED.status, medicine_batches.status);
      EXCEPTION
        WHEN undefined_column OR invalid_column_reference THEN
          -- If some columns don't exist in older schemas, try minimal upsert
          INSERT INTO medicine_batches (medication_id, batch_number, expiry_date, current_quantity)
          VALUES (NEW.medication_id, NEW.batch_number, NEW.expiry_date, v_qty)
          ON CONFLICT (batch_number)
          DO UPDATE SET current_quantity = COALESCE(medicine_batches.current_quantity, 0) + EXCLUDED.current_quantity;
        WHEN undefined_table THEN
          NULL;
      END;
    END IF;

    -- Create stock transaction record (ledger)
    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, expiry_date, notes, transaction_date
    ) VALUES (
      NEW.medication_id, 'purchase', v_qty,
      v_purchase_price, NEW.batch_number, NEW.expiry_date,
      'Purchase: ' || (SELECT purchase_number FROM drug_purchases WHERE id = NEW.purchase_id),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_update_stock_on_purchase ON drug_purchase_items;
CREATE TRIGGER trg_update_stock_on_purchase
AFTER INSERT ON drug_purchase_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_purchase();

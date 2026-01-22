-- Fix legacy references to medicine_batches.quantity by adding a generated alias column.
-- Some existing DB functions/triggers may still reference `quantity`.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'medicine_batches'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'medicine_batches' AND column_name = 'quantity'
    ) THEN
      -- Generated alias to keep in sync with current_quantity
      ALTER TABLE medicine_batches
        ADD COLUMN quantity INTEGER GENERATED ALWAYS AS (COALESCE(current_quantity, 0)) STORED;
    END IF;
  END IF;
END $$;

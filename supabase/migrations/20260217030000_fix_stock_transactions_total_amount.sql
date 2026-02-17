-- Fix stock_transactions.total_amount column
-- This was the actual cause of "cannot insert a non-DEFAULT value" error
-- The trigger trg_update_stock_on_purchase() inserts into stock_transactions
-- when a purchase item is created, and the generated column was blocking it

ALTER TABLE stock_transactions DROP COLUMN total_amount CASCADE;
ALTER TABLE stock_transactions ADD COLUMN total_amount NUMERIC(10,2) DEFAULT 0;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

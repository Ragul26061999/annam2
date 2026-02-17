-- Fix duplicate stock trigger issue
-- There were two triggers calling the same function, causing stock to be added twice
-- This resulted in inventory showing 100 units instead of 50 (5 qty × 10 pack = 50)

-- Drop the duplicate trigger
DROP TRIGGER IF EXISTS trg_drug_purchase_items_after_insert ON drug_purchase_items;

-- Keep only trg_update_stock_on_purchase trigger
-- This trigger properly calculates stock as quantity * pack_size

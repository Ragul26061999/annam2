-- Create RPC function to get batches with unit selling price calculated from pack price
-- This fixes the billing page showing pack rate (₹40) instead of unit rate (₹2.67)

CREATE OR REPLACE FUNCTION get_batches_with_unit_price()
RETURNS TABLE (
    id UUID,
    medicine_id UUID,
    medication_id UUID,
    batch_number VARCHAR,
    expiry_date DATE,
    current_quantity INTEGER,
    purchase_price NUMERIC,
    selling_price NUMERIC,
    status VARCHAR,
    batch_barcode VARCHAR,
    pack_size INTEGER,
    manufacturing_date DATE,
    received_date DATE,
    received_quantity INTEGER,
    supplier_name VARCHAR,
    supplier_batch_id VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN,
    batch_qr_code TEXT,
    supplier_id UUID,
    edited BOOLEAN,
    verified BOOLEAN,
    legacy_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mb.id,
        mb.medicine_id,
        mb.medication_id,
        mb.batch_number,
        mb.expiry_date,
        mb.current_quantity,
        mb.purchase_price,
        -- Calculate unit selling price from pack selling price
        CASE 
            WHEN dpi.pack_size > 0 AND dpi.pack_size IS NOT NULL 
            THEN ROUND(mb.selling_price / dpi.pack_size, 2)
            ELSE mb.selling_price
        END as selling_price,
        mb.status,
        mb.batch_barcode,
        dpi.pack_size::INTEGER,
        mb.manufacturing_date,
        mb.received_date,
        mb.received_quantity,
        mb.supplier_name,
        mb.supplier_batch_id,
        mb.notes,
        mb.created_at,
        mb.updated_at,
        mb.is_active,
        mb.batch_qr_code,
        mb.supplier_id,
        mb.edited,
        mb.verified,
        mb.legacy_code
    FROM medicine_batches mb
    LEFT JOIN LATERAL (
        SELECT pack_size 
        FROM drug_purchase_items 
        WHERE batch_number = mb.batch_number 
        AND medication_id = mb.medication_id
        ORDER BY created_at DESC
        LIMIT 1
    ) dpi ON true
    WHERE mb.current_quantity > 0
    AND mb.status = 'active'
    AND mb.expiry_date >= CURRENT_DATE
    ORDER BY mb.medication_id, mb.expiry_date;
END;
$$ LANGUAGE plpgsql;

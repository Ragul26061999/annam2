-- Create RPC function to get batches with unit selling price calculated from pack price
-- This fixes the billing page showing pack rate (₹40) instead of unit rate (₹2.67)

CREATE OR REPLACE FUNCTION get_batches_with_unit_price()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(batch_data ORDER BY batch_data->>'medication_id', batch_data->>'expiry_date')
    INTO result
    FROM (
        SELECT jsonb_build_object(
            'id', mb.id,
            'medicine_id', mb.medicine_id,
            'medication_id', mb.medication_id,
            'batch_number', mb.batch_number,
            'expiry_date', mb.expiry_date,
            'current_quantity', mb.current_quantity,
            'purchase_price', mb.purchase_price,
            'selling_price', CASE 
                WHEN dpi.pack_size > 0 AND dpi.pack_size IS NOT NULL 
                THEN ROUND(mb.selling_price / dpi.pack_size, 2)
                ELSE mb.selling_price
            END,
            'status', mb.status,
            'batch_barcode', mb.batch_barcode,
            'manufacturing_date', mb.manufacturing_date,
            'received_date', mb.received_date,
            'received_quantity', mb.received_quantity,
            'supplier_name', mb.supplier_name,
            'supplier_batch_id', mb.supplier_batch_id,
            'notes', mb.notes,
            'created_at', mb.created_at,
            'updated_at', mb.updated_at,
            'is_active', mb.is_active,
            'batch_qr_code', mb.batch_qr_code,
            'supplier_id', mb.supplier_id,
            'edited', mb.edited,
            'verified', mb.verified,
            'legacy_code', mb.legacy_code
        ) as batch_data
        FROM medicine_batches mb
        LEFT JOIN LATERAL (
            SELECT pack_size
            FROM drug_purchase_items 
            WHERE drug_purchase_items.batch_number = mb.batch_number 
            AND drug_purchase_items.medication_id = mb.medication_id
            ORDER BY created_at DESC
            LIMIT 1
        ) dpi ON true
        WHERE mb.current_quantity > 0
        AND mb.status = 'active'
        AND mb.expiry_date >= CURRENT_DATE
    ) batches;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

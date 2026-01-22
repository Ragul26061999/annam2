CREATE OR REPLACE FUNCTION trg_update_stock_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_supplier_id UUID;
BEGIN
    -- Get purchase details
    SELECT created_by, supplier_id INTO v_user_id, v_supplier_id
    FROM drug_purchases
    WHERE id = NEW.purchase_id;

    -- Update or insert batch
    INSERT INTO medicine_batches (
        medicine_id,
        medication_id,
        batch_number,
        expiry_date,
        received_quantity,
        current_quantity,
        purchase_price,
        selling_price,
        supplier_id,
        created_at,
        updated_at
    )
    VALUES (
        NEW.medication_id,
        NEW.medication_id,
        NEW.batch_number,
        NEW.expiry_date,
        NEW.quantity,
        NEW.quantity,
        NEW.purchase_rate,
        NEW.selling_rate,
        v_supplier_id,
        now(),
        now()
    )
    ON CONFLICT (medicine_id, batch_number) 
    DO UPDATE SET 
        received_quantity = medicine_batches.received_quantity + NEW.quantity,
        current_quantity = medicine_batches.current_quantity + NEW.quantity,
        purchase_price = NEW.purchase_rate,
        selling_price = COALESCE(NEW.selling_rate, medicine_batches.selling_price),
        updated_at = now();
    
    -- Update medication stock
    UPDATE medications 
    SET total_stock = COALESCE(total_stock, 0) + NEW.quantity,
        available_stock = COALESCE(available_stock, 0) + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.medication_id;
    
    -- Create stock transaction
    -- Removed total_amount as it is a generated column
    INSERT INTO stock_transactions (
        medication_id,
        batch_number,
        transaction_type,
        quantity,
        unit_price,
        performed_by,
        created_at
    ) VALUES (
        NEW.medication_id,
        NEW.batch_number,
        'purchase',
        NEW.quantity,
        NEW.purchase_rate,
        v_user_id,
        now()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

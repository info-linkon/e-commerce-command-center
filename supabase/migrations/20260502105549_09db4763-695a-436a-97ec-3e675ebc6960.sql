-- One-time data fix: restore inventory for cancelled order #267
-- Order id: 04e8eb64-b690-47ee-a08c-3a5936479141
-- Variation: be3b480b-6fba-4ca0-b33b-ffc4e978f197 at warehouse b4dd8911-de7b-4632-859b-c853486d4c2b
-- The cancellation never restored the -1 deducted at warehouse assignment.

DO $$
DECLARE
  v_inv_id uuid := 'd2ea2bec-f7ae-4a83-8aed-9cd8c002915b';
  v_order_id uuid := '04e8eb64-b690-47ee-a08c-3a5936479141';
  v_var_id uuid := 'be3b480b-6fba-4ca0-b33b-ffc4e978f197';
  v_wh_id uuid := 'b4dd8911-de7b-4632-859b-c853486d4c2b';
  v_new_qty int;
  v_already_restored boolean;
BEGIN
  -- Idempotency: skip if a restore log already exists for this order
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_log
    WHERE reference_id = v_order_id
      AND action_type = 'adjustment'
      AND notes ILIKE '%החזרת מלאי%'
  ) INTO v_already_restored;

  IF v_already_restored THEN
    RAISE NOTICE 'Order 267 inventory already restored — skipping';
    RETURN;
  END IF;

  UPDATE public.inventory
  SET quantity = quantity + 1, updated_at = now()
  WHERE id = v_inv_id
  RETURNING quantity INTO v_new_qty;

  INSERT INTO public.inventory_log (
    variation_id, warehouse_id, quantity_change, quantity_after,
    action_type, reference_id, notes
  ) VALUES (
    v_var_id, v_wh_id, 1, v_new_qty,
    'adjustment', v_order_id,
    'תיקון רטרואקטיבי — ביטול הזמנה #267 לא החזיר מלאי'
  );
END $$;
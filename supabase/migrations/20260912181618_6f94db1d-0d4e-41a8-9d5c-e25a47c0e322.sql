DO $$
DECLARE
  v_order uuid;
  v_wh uuid := 'b4dd8911-de7b-4632-859b-c853486d4c2b';
  r record;
  v_after integer;
BEGIN
  SELECT id INTO v_order FROM public.orders WHERE order_number = 597;
  IF v_order IS NULL THEN RETURN; END IF;

  -- 1. Restore the duplicated inventory deduction (half of what was deducted)
  FOR r IN
    SELECT variation_id, (SUM(-quantity_change) / 2)::int AS restore_qty
    FROM public.inventory_log
    WHERE reference_id = v_order AND action_type = 'sale'
    GROUP BY variation_id
    HAVING COUNT(*) = 2
  LOOP
    UPDATE public.inventory
      SET quantity = quantity + r.restore_qty, updated_at = now()
      WHERE variation_id = r.variation_id AND warehouse_id = v_wh
      RETURNING quantity INTO v_after;

    IF v_after IS NOT NULL THEN
      INSERT INTO public.inventory_log (variation_id, warehouse_id, quantity_change, quantity_after, action_type, reference_id, notes)
      VALUES (r.variation_id, v_wh, r.restore_qty, v_after, 'adjustment', v_order, 'תיקון ניכוי כפול בשיוך הזמנה #597');
    END IF;
  END LOOP;

  -- 2. Remove duplicated picking rows (keep half per order_item + variation, prefer picked ones)
  WITH ranked AS (
    SELECT id, order_item_id, variation_id,
           ROW_NUMBER() OVER (PARTITION BY order_item_id, variation_id ORDER BY picked DESC, id) AS rn,
           COUNT(*) OVER (PARTITION BY order_item_id, variation_id) AS total
    FROM public.order_picking_items
    WHERE order_id = v_order
  )
  DELETE FROM public.order_picking_items p
  USING ranked
  WHERE p.id = ranked.id AND ranked.total % 2 = 0 AND ranked.rn > ranked.total / 2;
END $$;
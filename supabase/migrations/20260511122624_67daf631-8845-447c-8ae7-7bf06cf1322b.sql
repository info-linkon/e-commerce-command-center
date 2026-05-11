-- Backfill the missing HYP credit payment for order #303.
-- The customer was actually charged ₪700 (HYP Id=425716837, CCode=0) but our
-- old verifier rejected it as amount_mismatch because it compared against the
-- full order total (₪1109.25) instead of the digital portion (₪700).

DO $$
DECLARE
  v_order_id uuid;
  v_hyp_register uuid;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = 303;
  IF v_order_id IS NULL THEN
    RAISE NOTICE 'Order 303 not found, skipping';
    RETURN;
  END IF;

  SELECT id INTO v_hyp_register
  FROM public.cash_registers
  WHERE name ILIKE '%HYP%' AND is_active = true
  LIMIT 1;

  -- Idempotent insert (relies on unique index on payments(order_id, reference))
  INSERT INTO public.payments (order_id, amount, payment_method, reference, cash_register_id)
  VALUES (v_order_id, 700, 'credit', 'HYP-425716837', v_hyp_register)
  ON CONFLICT DO NOTHING;

  -- Bump the HYP register balance only if we actually inserted a new row
  IF FOUND AND v_hyp_register IS NOT NULL THEN
    UPDATE public.cash_registers
    SET current_balance = current_balance + 700,
        updated_at = now()
    WHERE id = v_hyp_register;
  END IF;

  UPDATE public.orders
  SET hyp_transaction_id = COALESCE(hyp_transaction_id, '425716837'),
      status = CASE WHEN status = 'pending' THEN 'processing'::order_status ELSE status END,
      payment_link_url = NULL,
      woo_sync_error = NULL
  WHERE id = v_order_id;
END $$;
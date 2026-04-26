-- Backfill: assign existing credit payments without a register to the HYP register,
-- and bump the HYP register's balance by the same total.
DO $$
DECLARE
  hyp_id uuid;
  bump   numeric;
BEGIN
  SELECT id INTO hyp_id
  FROM public.cash_registers
  WHERE name ILIKE '%HYP%' AND is_active = true
  LIMIT 1;

  IF hyp_id IS NULL THEN
    RAISE NOTICE 'HYP register not found — skipping backfill';
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO bump
  FROM public.payments
  WHERE payment_method = 'credit' AND cash_register_id IS NULL;

  UPDATE public.payments
  SET cash_register_id = hyp_id
  WHERE payment_method = 'credit' AND cash_register_id IS NULL;

  IF bump > 0 THEN
    UPDATE public.cash_registers
    SET current_balance = current_balance + bump
    WHERE id = hyp_id;
  END IF;
END $$;
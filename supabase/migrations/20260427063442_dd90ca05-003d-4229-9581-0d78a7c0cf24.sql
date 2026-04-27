
UPDATE public.cash_registers cr
SET current_balance = sub.new_balance,
    updated_at = now()
FROM (
  SELECT
    cr.id,
    cr.opening_balance
    + COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p
        JOIN public.orders o ON o.id = p.order_id
        WHERE p.cash_register_id = cr.id
          AND p.payment_method = 'cash'
          AND o.status = 'completed'
      ), 0)
    - COALESCE((
        SELECT SUM(e.amount)
        FROM public.expenses e
        WHERE e.cash_register_id = cr.id
          AND e.payment_source = 'cash_register'
      ), 0)
    + COALESCE((
        SELECT SUM(t.amount) FROM public.cash_transfers t WHERE t.to_register_id = cr.id
      ), 0)
    - COALESCE((
        SELECT SUM(t.amount) FROM public.cash_transfers t WHERE t.from_register_id = cr.id
      ), 0)
    AS new_balance
  FROM public.cash_registers cr
  WHERE cr.name IN ('קופה טארק','קופה כרם','קופה מחמד')
) sub
WHERE cr.id = sub.id;

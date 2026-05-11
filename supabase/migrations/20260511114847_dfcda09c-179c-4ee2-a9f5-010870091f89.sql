-- Fix order #303: legacy split credit placeholder was stored as a real payment.
-- Move it to orders.digital_payment_amount and remove the placeholder payment row.
UPDATE public.orders o
SET digital_payment_amount = planned.amount
FROM (
  SELECT p.order_id, COALESCE(SUM(p.amount), 0) AS amount
  FROM public.payments p
  JOIN public.orders ord ON ord.id = p.order_id
  WHERE ord.order_number = 303
    AND ord.payment_method = 'split'
    AND p.payment_method = 'credit'
    AND p.reference IS NULL
  GROUP BY p.order_id
) planned
WHERE o.id = planned.order_id
  AND COALESCE(o.digital_payment_amount, 0) = 0;

DELETE FROM public.payments p
USING public.orders o
WHERE p.order_id = o.id
  AND o.order_number = 303
  AND o.payment_method = 'split'
  AND p.payment_method = 'credit'
  AND p.reference IS NULL;
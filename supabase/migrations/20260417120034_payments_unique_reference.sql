-- Enforce idempotency on HYP payments: a given HYP transaction Id (stored as `HYP-{Id}` in reference)
-- can only be recorded once per order. Partial index allows rows with NULL reference (cash/POS payments).
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_reference_unique
  ON public.payments (order_id, reference)
  WHERE reference IS NOT NULL;

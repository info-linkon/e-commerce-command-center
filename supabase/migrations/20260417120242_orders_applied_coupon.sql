-- Track which coupon was applied to an order so we can increment `used_count`
-- authoritatively AFTER successful payment (in hyp-verify / cash checkout),
-- instead of optimistically before HYP redirect.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS applied_coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_applied_coupon_idx ON public.orders (applied_coupon_id) WHERE applied_coupon_id IS NOT NULL;

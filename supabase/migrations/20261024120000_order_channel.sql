-- Client notes §7.8: how a POS / manual order reached the store.
-- Required in the POS UI; nullable here so existing and website orders are valid.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_channel text
  CHECK (order_channel IS NULL OR order_channel IN ('whatsapp', 'phone', 'store', 'instagram', 'referral', 'other'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS invoice_issued_manually boolean NOT NULL DEFAULT false;
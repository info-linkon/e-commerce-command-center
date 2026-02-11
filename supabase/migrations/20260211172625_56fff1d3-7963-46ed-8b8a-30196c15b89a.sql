
-- Payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'bit', 'credit');

-- Order source enum
CREATE TYPE public.order_source AS ENUM ('manual', 'pos', 'website');

-- Add source to orders
ALTER TABLE public.orders ADD COLUMN source public.order_source NOT NULL DEFAULT 'manual';
ALTER TABLE public.orders ADD COLUMN cash_register_id UUID REFERENCES public.cash_registers(id);

-- Payments table (supports split payments)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method public.payment_method NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cash_register_id UUID REFERENCES public.cash_registers(id),
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage payments"
  ON public.payments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_payments_order_id ON public.payments(order_id);

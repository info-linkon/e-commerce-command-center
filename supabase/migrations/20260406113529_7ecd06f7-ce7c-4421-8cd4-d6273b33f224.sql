ALTER TABLE public.orders
ADD COLUMN discount_type text DEFAULT NULL,
ADD COLUMN discount_value numeric DEFAULT 0,
ADD COLUMN discount_amount numeric DEFAULT 0;
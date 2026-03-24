
-- 1. Arabic columns for products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_ar text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description_ar text;

-- 2. Arabic column for variations
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS name_ar text;

-- 3. VAT flag on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS includes_vat boolean DEFAULT true;

-- 4. created_by on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 5. Add write_off to inventory_action_type enum
ALTER TYPE public.inventory_action_type ADD VALUE IF NOT EXISTS 'write_off';

-- 6. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  city text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage customers" ON public.customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Add customer_id to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

-- 8. Create product-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');

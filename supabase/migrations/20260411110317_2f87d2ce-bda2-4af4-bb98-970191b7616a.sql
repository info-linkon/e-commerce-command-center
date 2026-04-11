-- 1. Add new order statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picking';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'shipping';

-- 2. Add new SMS triggers
ALTER TYPE sms_trigger ADD VALUE IF NOT EXISTS 'order_picking';
ALTER TYPE sms_trigger ADD VALUE IF NOT EXISTS 'order_shipping';

-- 3. Create product_categories junction table
CREATE TABLE IF NOT EXISTS public.product_categories (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (product_id, category_id)
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product_categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage product_categories" ON public.product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Migrate existing category_id data
INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id FROM public.products WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Seed customers from orders
INSERT INTO public.customers (name, phone, email, city)
SELECT DISTINCT ON (customer_phone)
  COALESCE(customer_name, ''), customer_phone, customer_email, shipping_city
FROM public.orders
WHERE customer_phone IS NOT NULL AND customer_phone != ''
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.phone = orders.customer_phone)
ON CONFLICT DO NOTHING;
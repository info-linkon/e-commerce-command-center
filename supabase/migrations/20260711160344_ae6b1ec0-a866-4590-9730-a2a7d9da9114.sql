
-- 1. related_products table
CREATE TABLE public.related_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, related_product_id),
  CHECK (product_id <> related_product_id)
);

GRANT SELECT ON public.related_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.related_products TO authenticated;
GRANT ALL ON public.related_products TO service_role;

ALTER TABLE public.related_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Related products are viewable by everyone"
  ON public.related_products FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage related products"
  ON public.related_products FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_related_products_product_id ON public.related_products(product_id);

-- 2. bundle_variations.image_url
ALTER TABLE public.bundle_variations ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. compare_at_price on products and product_variations
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC;
ALTER TABLE public.product_variations ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC;

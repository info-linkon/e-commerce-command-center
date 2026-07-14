
ALTER TABLE public.exclusive_deals
  ADD COLUMN IF NOT EXISTS variation_id uuid NULL REFERENCES public.product_variations(id) ON DELETE CASCADE;

ALTER TABLE public.exclusive_deals DROP CONSTRAINT IF EXISTS exclusive_deals_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS exclusive_deals_product_variation_unique
  ON public.exclusive_deals (product_id, COALESCE(variation_id, '00000000-0000-0000-0000-000000000000'::uuid));

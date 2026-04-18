-- Ensure every bundle product has a "ברירת מחדל" variation, mirroring the
-- pattern used by all healthy bundles. This prevents the website checkout
-- from falling back to "ghost" Woo-imported variations and recording a
-- variation the customer never selected.
INSERT INTO public.product_variations (product_id, name, price, cost_price)
SELECT p.id, 'ברירת מחדל', p.sale_price, p.cost_price
FROM public.products p
JOIN public.bundles b ON b.product_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variations pv
  WHERE pv.product_id = p.id AND pv.name = 'ברירת מחדל'
);
-- Ensure every bundle product has a "ברירת מחדל" product_variation row.
-- Variable bundles were missing this and broke the web checkout normalization
-- which only resolves cart variation IDs against product_variations.
INSERT INTO public.product_variations (product_id, name, price, cost_price)
SELECT p.id, 'ברירת מחדל', COALESCE(p.sale_price, 0), COALESCE(p.cost_price, 0)
FROM public.products p
JOIN public.bundles b ON b.product_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variations pv WHERE pv.product_id = p.id
);

-- Backfill inventory rows so the new default variations have a stock entry
-- in every active warehouse (qty 0). Mirrors the auto-create behavior used
-- elsewhere when a variation is added.
INSERT INTO public.inventory (variation_id, warehouse_id, quantity)
SELECT pv.id, w.id, 0
FROM public.product_variations pv
JOIN public.bundles b ON b.product_id = pv.product_id
CROSS JOIN public.warehouses w
WHERE pv.name = 'ברירת מחדל'
  AND w.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory i
    WHERE i.variation_id = pv.id AND i.warehouse_id = w.id
  );
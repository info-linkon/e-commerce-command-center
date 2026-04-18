-- Remove inventory rows for "ghost" product_variations belonging to bundles.
-- Keeps product_variations + order_items intact (preserves order history).
-- Excludes "ברירת מחדל" rows (required by POS/cart).
DELETE FROM public.inventory
WHERE variation_id IN (
  SELECT pv.id
  FROM public.product_variations pv
  JOIN public.products p ON p.id = pv.product_id
  JOIN public.bundles b ON b.product_id = p.id
  WHERE pv.name <> 'ברירת מחדל'
);
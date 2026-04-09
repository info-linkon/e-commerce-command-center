ALTER TABLE public.order_picking_items
ADD COLUMN IF NOT EXISTS variation_id uuid REFERENCES public.product_variations(id),
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

UPDATE public.order_picking_items opi
SET variation_id = oi.variation_id,
    quantity = oi.quantity
FROM public.order_items oi
WHERE opi.order_item_id = oi.id
  AND opi.variation_id IS NULL
  AND oi.variation_id IS NOT NULL;

DELETE FROM public.order_picking_items opi
USING public.order_items oi,
      public.product_variations pv,
      public.bundles b
WHERE opi.order_item_id = oi.id
  AND oi.variation_id = pv.id
  AND pv.product_id = b.product_id;

INSERT INTO public.order_picking_items (order_id, order_item_id, variation_id, quantity, picked, picked_at, picked_by)
SELECT
  oi.order_id,
  oi.id,
  bi.variation_id,
  bi.quantity * oi.quantity,
  false,
  null,
  null
FROM public.order_items oi
JOIN public.product_variations pv ON pv.id = oi.variation_id
JOIN public.bundles b ON b.product_id = pv.product_id
JOIN public.bundle_items bi ON bi.bundle_id = b.id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.order_picking_items existing
  WHERE existing.order_item_id = oi.id
    AND existing.variation_id = bi.variation_id
);
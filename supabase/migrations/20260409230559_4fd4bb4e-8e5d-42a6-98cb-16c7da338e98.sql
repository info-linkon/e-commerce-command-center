ALTER TABLE public.order_picking_items
ADD COLUMN IF NOT EXISTS variation_id uuid REFERENCES public.product_variations(id),
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

UPDATE public.order_picking_items opi
SET variation_id = oi.variation_id,
    quantity = oi.quantity
FROM public.order_items oi
WHERE opi.order_item_id = oi.id
  AND opi.variation_id IS NULL;

WITH bundle_order_items AS (
  SELECT
    oi.id AS order_item_id,
    oi.order_id,
    oi.quantity AS order_quantity,
    pv.product_id,
    b.id AS bundle_id
  FROM public.order_items oi
  JOIN public.product_variations pv ON pv.id = oi.variation_id
  JOIN public.bundles b ON b.product_id = pv.product_id
), deleted AS (
  DELETE FROM public.order_picking_items opi
  USING bundle_order_items boi
  WHERE opi.order_item_id = boi.order_item_id
  RETURNING opi.order_item_id
)
INSERT INTO public.order_picking_items (order_id, order_item_id, variation_id, quantity, picked, picked_at, picked_by)
SELECT
  boi.order_id,
  boi.order_item_id,
  bi.variation_id,
  bi.quantity * boi.order_quantity,
  false,
  null,
  null
FROM bundle_order_items boi
JOIN public.bundle_items bi ON bi.bundle_id = boi.bundle_id;
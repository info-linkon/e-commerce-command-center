CREATE UNIQUE INDEX IF NOT EXISTS order_picking_items_order_item_variation_unique
ON public.order_picking_items (order_item_id, variation_id)
WHERE variation_id IS NOT NULL;
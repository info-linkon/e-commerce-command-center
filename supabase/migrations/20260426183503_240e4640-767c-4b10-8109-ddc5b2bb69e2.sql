-- Delete all orders created before 2026-04-01 along with all dependent records
WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.payment_events WHERE order_id IN (SELECT id FROM target_orders);

WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.order_picking_items WHERE order_id IN (SELECT id FROM target_orders);

WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.deliveries WHERE order_id IN (SELECT id FROM target_orders);

WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.documents WHERE order_id IN (SELECT id FROM target_orders);

WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.payments WHERE order_id IN (SELECT id FROM target_orders);

WITH target_orders AS (
  SELECT id FROM public.orders WHERE created_at < '2026-04-01'
)
DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM target_orders);

DELETE FROM public.orders WHERE created_at < '2026-04-01';
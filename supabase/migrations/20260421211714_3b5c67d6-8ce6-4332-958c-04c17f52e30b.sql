-- Allow anonymous (public storefront) to CREATE orders, order items, and customers.
-- Reads/updates remain restricted to authenticated CRM users (orders contain PII).

-- orders: allow public INSERT only (no SELECT/UPDATE/DELETE for anon)
DROP POLICY IF EXISTS "public_insert" ON public.orders;
CREATE POLICY "public_insert" ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- order_items: allow public INSERT only
DROP POLICY IF EXISTS "public_insert" ON public.order_items;
CREATE POLICY "public_insert" ON public.order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- customers: allow public INSERT only (storefront creates customer record on checkout)
DROP POLICY IF EXISTS "public_insert" ON public.customers;
CREATE POLICY "public_insert" ON public.customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- payments: allow public INSERT only (HYP redirect / web checkout records payment)
DROP POLICY IF EXISTS "public_insert" ON public.payments;
CREATE POLICY "public_insert" ON public.payments
  FOR INSERT
  TO anon
  WITH CHECK (true);
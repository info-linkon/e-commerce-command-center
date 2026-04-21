-- Revert the temporary public INSERT policies — checkout now goes through
-- the `web-create-order` edge function (service role), so anon never needs
-- direct table access. Restoring authenticated-only protects PII.

DROP POLICY IF EXISTS "public_insert" ON public.orders;
DROP POLICY IF EXISTS "public_insert" ON public.order_items;
DROP POLICY IF EXISTS "public_insert" ON public.customers;
DROP POLICY IF EXISTS "public_insert" ON public.payments;
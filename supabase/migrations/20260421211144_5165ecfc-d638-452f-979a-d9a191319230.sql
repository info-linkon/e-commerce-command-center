-- Allow anonymous (public website) to READ inventory & bundle composition.
-- This is required for the storefront to compute "in stock" status.
-- Writes remain restricted to authenticated CRM users.

-- inventory: quantity per variation per warehouse
DROP POLICY IF EXISTS "public_read" ON public.inventory;
CREATE POLICY "public_read" ON public.inventory
  FOR SELECT
  USING (true);

-- bundle_items (already had public_read, ensure idempotently)
DROP POLICY IF EXISTS "public_read" ON public.bundle_items;
CREATE POLICY "public_read" ON public.bundle_items
  FOR SELECT
  USING (true);

-- bundle_variation_items (already had public_read, ensure idempotently)
DROP POLICY IF EXISTS "public_read" ON public.bundle_variation_items;
CREATE POLICY "public_read" ON public.bundle_variation_items
  FOR SELECT
  USING (true);

-- bundles + bundle_variations already have public_read; no change needed.

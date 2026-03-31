
-- Allow anon users to view bundles (needed for web storefront)
CREATE POLICY "Public can view bundles" ON public.bundles FOR SELECT TO anon USING (true);

-- Allow anon users to view bundle_variations
CREATE POLICY "Public can view bundle_variations" ON public.bundle_variations FOR SELECT TO anon USING (true);

-- Allow anon users to view bundle_items (for stock calculation)
CREATE POLICY "Public can view bundle_items" ON public.bundle_items FOR SELECT TO anon USING (true);

-- Allow anon users to view bundle_variation_items (for stock calculation)
CREATE POLICY "Public can view bundle_variation_items" ON public.bundle_variation_items FOR SELECT TO anon USING (true);

-- Allow anon users to view inventory (for stock calculation on web)
CREATE POLICY "Public can view inventory" ON public.inventory FOR SELECT TO anon USING (true);

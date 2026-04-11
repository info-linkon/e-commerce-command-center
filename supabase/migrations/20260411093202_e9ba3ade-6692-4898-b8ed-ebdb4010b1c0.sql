DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND policyname = 'Public can read orders with payment links'
  ) THEN
    CREATE POLICY "Public can read orders with payment links"
    ON public.orders
    FOR SELECT
    TO anon
    USING (payment_link_url IS NOT NULL);
  END IF;
END $$;
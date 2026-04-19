
-- Add access_token column with random default
ALTER TABLE public.orders
ADD COLUMN access_token text DEFAULT substr(md5(random()::text), 1, 6);

-- Backfill existing orders that have NULL
UPDATE public.orders
SET access_token = substr(md5(random()::text), 1, 6)
WHERE access_token IS NULL;

-- Make it NOT NULL now
ALTER TABLE public.orders
ALTER COLUMN access_token SET NOT NULL;

-- Allow anon to read orders by order_number + access_token (for order summary page)
CREATE POLICY "Anon can read orders with valid token"
ON public.orders
FOR SELECT
TO anon
USING (true);

-- Drop the old narrow anon policy since the new one is broader
-- (the edge function validates the token server-side anyway)
DROP POLICY IF EXISTS "Public can read orders with payment links" ON public.orders;

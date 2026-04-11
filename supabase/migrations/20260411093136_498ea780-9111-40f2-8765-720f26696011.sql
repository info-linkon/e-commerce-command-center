CREATE OR REPLACE VIEW public.public_payment_links
WITH (security_invoker = on) AS
SELECT order_number, payment_link_url, status
FROM public.orders
WHERE payment_link_url IS NOT NULL;

GRANT SELECT ON public.public_payment_links TO anon, authenticated;
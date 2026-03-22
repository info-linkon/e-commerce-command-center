ALTER TABLE public.orders
ADD COLUMN shipping_address text DEFAULT NULL,
ADD COLUMN shipping_city text DEFAULT NULL,
ADD COLUMN shipping_country text DEFAULT NULL,
ADD COLUMN shipping_postcode text DEFAULT NULL;
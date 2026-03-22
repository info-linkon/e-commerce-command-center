ALTER TABLE public.orders 
ADD COLUMN woo_sync_status text DEFAULT NULL,
ADD COLUMN woo_sync_error text DEFAULT NULL;
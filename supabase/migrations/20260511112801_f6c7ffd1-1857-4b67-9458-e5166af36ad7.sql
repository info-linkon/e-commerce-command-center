alter table public.orders
add column if not exists digital_payment_amount numeric not null default 0;
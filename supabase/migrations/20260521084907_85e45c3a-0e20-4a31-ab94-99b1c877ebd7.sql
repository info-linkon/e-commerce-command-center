-- 1) Add 'delivered' status (between shipping and completed - controlled by UI)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'delivered';

-- 2) Add 'order_delivered' SMS trigger
ALTER TYPE public.sms_trigger ADD VALUE IF NOT EXISTS 'order_delivered';

-- 3) Add optional locale to sms_templates (null = applies to any language)
ALTER TABLE public.sms_templates
  ADD COLUMN IF NOT EXISTS locale text;

-- 4) Add lang to orders so we know which language to use for notifications
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'ar';

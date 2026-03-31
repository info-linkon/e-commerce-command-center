
-- SMS Templates
CREATE TYPE public.sms_trigger AS ENUM ('order_created', 'order_shipped', 'order_completed');

CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger sms_trigger NOT NULL,
  template_text text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sms_templates"
  ON public.sms_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view sms_templates"
  ON public.sms_templates FOR SELECT TO authenticated
  USING (true);

-- HYP: Add pending_payment to order_status enum and hyp_transaction_id column
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS hyp_transaction_id text;

-- Structured log for payment-related side-effects (invoice generation, SMS, email, Woo sync, Notify URL).
-- Allows ops to see exactly what happened during HYP verify beyond ad-hoc console.error logs.
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  success boolean NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_events_order_id_idx ON public.payment_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_events_type_idx ON public.payment_events (event_type, created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_admin_read"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (true);


CREATE TYPE public.intake_status AS ENUM ('draft', 'completed');

CREATE TABLE public.intake_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  supplier_name text,
  reference_number text,
  notes text,
  total_items integer NOT NULL DEFAULT 0,
  status intake_status NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage intake_sessions" ON public.intake_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view intake_sessions" ON public.intake_sessions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.intake_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  variation_id uuid NOT NULL REFERENCES public.product_variations(id),
  quantity integer NOT NULL DEFAULT 1,
  cost_price numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.intake_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage intake_session_items" ON public.intake_session_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view intake_session_items" ON public.intake_session_items FOR SELECT TO authenticated USING (true);


CREATE TABLE public.exclusive_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.exclusive_deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exclusive_deals TO authenticated;
GRANT ALL ON public.exclusive_deals TO service_role;

ALTER TABLE public.exclusive_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exclusive deals"
  ON public.exclusive_deals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert exclusive deals"
  ON public.exclusive_deals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update exclusive deals"
  ON public.exclusive_deals FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can delete exclusive deals"
  ON public.exclusive_deals FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_exclusive_deals_updated_at
  BEFORE UPDATE ON public.exclusive_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exclusive_deals_sort ON public.exclusive_deals(sort_order, active);

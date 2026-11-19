-- Olivery delivery API integration
ALTER TABLE public.delivery_companies
  ADD COLUMN IF NOT EXISTS provider text;

COMMENT ON COLUMN public.delivery_companies.provider IS
  'External API provider for this company (e.g. ''olivery''). NULL = manual company.';

ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_sequence text,
  ADD COLUMN IF NOT EXISTS external_status text,
  ADD COLUMN IF NOT EXISTS external_area text,
  ADD COLUMN IF NOT EXISTS external_sub_area text,
  ADD COLUMN IF NOT EXISTS cod_amount numeric,
  ADD COLUMN IF NOT EXISTS external_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_error text;

CREATE INDEX IF NOT EXISTS deliveries_external_sequence_idx
  ON public.deliveries (external_sequence)
  WHERE external_sequence IS NOT NULL;

-- Olivery company
INSERT INTO public.delivery_companies (name, is_internal, is_active, provider)
SELECT 'Olivery', false, true, 'olivery'
WHERE NOT EXISTS (SELECT 1 FROM public.delivery_companies WHERE provider = 'olivery');

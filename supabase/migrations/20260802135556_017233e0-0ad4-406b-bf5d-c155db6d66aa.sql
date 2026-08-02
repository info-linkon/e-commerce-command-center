CREATE TABLE public.marketing_sms_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  body text NOT NULL,
  locale text NOT NULL DEFAULT 'he',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_sms_templates TO authenticated;
GRANT ALL ON public.marketing_sms_templates TO service_role;

ALTER TABLE public.marketing_sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage marketing sms templates"
ON public.marketing_sms_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_marketing_sms_templates_updated_at
BEFORE UPDATE ON public.marketing_sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
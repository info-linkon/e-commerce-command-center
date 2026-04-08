ALTER TABLE public.sms_templates 
  ADD COLUMN recipient_type text NOT NULL DEFAULT 'customer',
  ADD COLUMN recipient_phone text NULL;
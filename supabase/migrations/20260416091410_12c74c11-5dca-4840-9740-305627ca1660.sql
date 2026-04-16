
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert otp_codes"
  ON public.otp_codes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read otp_codes"
  ON public.otp_codes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can update otp_codes"
  ON public.otp_codes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_otp_codes_phone_code ON public.otp_codes (phone, code);

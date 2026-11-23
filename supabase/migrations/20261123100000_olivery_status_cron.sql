-- Automatic Olivery status sync every 30 minutes.
--
-- pg_cron calls the `olivery` edge function with action "sync_all".
-- Auth: a random token kept in Vault (never in code). The function checks it
-- through verify_olivery_cron_token(), which only the service role may call.
-- The token only allows "sync_all", nothing else. The anon key below is the
-- public client key (already in src/integrations/supabase/client.ts) and is
-- only needed to pass the Functions gateway.

-- 1) Token in Vault (created once)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'olivery_cron_token') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'olivery_cron_token', 'Auth token for the Olivery status sync cron job');
  END IF;
END $$;

-- 2) Token check, callable only by the service role (used by the edge function)
CREATE OR REPLACE FUNCTION public.verify_olivery_cron_token(p_token text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'olivery_cron_token' AND decrypted_secret = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_olivery_cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_olivery_cron_token(text) TO service_role;

-- 3) Schedule (re-create if it exists)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'olivery-status-sync';

SELECT cron.schedule(
  'olivery-status-sync',
  '*/30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/olivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib3NrcHZmdndyc2lxd3pwY3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc2NDIsImV4cCI6MjA4NjQwMzY0Mn0.yB_DLYwx7iPTMSixOeAHL01EeqpCUtQLOIRsyyz38Tk',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib3NrcHZmdndyc2lxd3pwY3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc2NDIsImV4cCI6MjA4NjQwMzY0Mn0.yB_DLYwx7iPTMSixOeAHL01EeqpCUtQLOIRsyyz38Tk',
      'x-cron-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'olivery_cron_token')
    ),
    body := '{"action":"sync_all"}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);

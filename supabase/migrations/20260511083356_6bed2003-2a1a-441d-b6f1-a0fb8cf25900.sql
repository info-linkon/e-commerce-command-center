SELECT cron.schedule(
  'auto-cancel-pending-payment-orders',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/auto-cancel-pending',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdib3NrcHZmdndyc2lxd3pwY3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc2NDIsImV4cCI6MjA4NjQwMzY0Mn0.yB_DLYwx7iPTMSixOeAHL01EeqpCUtQLOIRsyyz38Tk"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
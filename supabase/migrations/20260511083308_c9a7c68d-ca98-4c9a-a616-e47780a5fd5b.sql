-- Add invoice_issued SMS trigger value
ALTER TYPE sms_trigger ADD VALUE IF NOT EXISTS 'invoice_issued';

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
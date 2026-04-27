CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'process-alerts-every-15min',
  '*/15 * * * *',
  $cronbody$
  SELECT net.http_post(
    url := 'https://ixtxxkirnxujregneneb.supabase.co/functions/v1/process-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cronbody$
);

SELECT cron.schedule(
  'process-alerts-every-15min',
  '*/15 * * * *',
  $cronbody$
  SELECT net.http_post(
    url := 'https://ixtxxkirnxujregneneb.supabase.co/functions/v1/process-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'pg_cron_service_role_key'
        LIMIT 1
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cronbody$
);

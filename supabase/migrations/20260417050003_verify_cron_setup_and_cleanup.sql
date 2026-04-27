DO $$
DECLARE
  secret_exists boolean;
  job_count integer;
  request_id bigint;
BEGIN
  SELECT EXISTS(SELECT 1 FROM vault.secrets WHERE name = 'pg_cron_service_role_key')
    INTO secret_exists;
  RAISE NOTICE 'Vault secret exists: %', secret_exists;

  SELECT count(*)::int INTO job_count
    FROM cron.job WHERE jobname = 'process-alerts-every-15min';
  RAISE NOTICE 'Cron jobs with name process-alerts-every-15min: %', job_count;

  SELECT net.http_post(
    url := 'https://ixtxxkirnxujregneneb.supabase.co/functions/v1/process-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'pg_cron_service_role_key' LIMIT 1
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO request_id;
  RAISE NOTICE 'Manual http_post request_id: %', request_id;
END
$$;

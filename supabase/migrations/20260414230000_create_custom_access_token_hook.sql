CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  claims jsonb;
  profile_org_id uuid;
  profile_role text;
BEGIN
  claims := event->'claims';

  SELECT org_id, role INTO profile_org_id, profile_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  IF profile_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata}',
      COALESCE(claims->'app_metadata', '{}'::jsonb) ||
      jsonb_build_object('org_id', profile_org_id, 'role', COALESCE(profile_role, 'doctor'))
    );
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

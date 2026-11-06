-- Hosted Supabase does not let postgres grant USAGE on managed auth to custom roles.
-- A private boolean boundary replaces direct Auth reads, without exposing secrets or rows.
CREATE FUNCTION sorteos.admin_auth_session_valid(require_mfa boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'sorteos_runtime'
    OR current_setting('app.actor_kind',true) IS DISTINCT FROM 'ADMIN' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM sorteos.admin_users a JOIN auth.sessions s ON s.user_id=a.auth_user_id
    WHERE a.id=nullif(current_setting('app.actor_id',true),'')::uuid AND a.active
      AND a.auth_user_id=nullif(current_setting('app.auth_user_id',true),'')::uuid
      AND s.id=nullif(current_setting('app.auth_session_id',true),'')::uuid
      AND (s.not_after IS NULL OR s.not_after>clock_timestamp())
      AND (require_mfa IS FALSE OR (require_mfa IS TRUE AND s.aal::text='aal2' AND EXISTS (
        SELECT 1 FROM auth.mfa_factors f WHERE f.id=s.factor_id AND f.user_id=s.user_id
          AND f.status::text='verified' AND f.factor_type::text='totp'
      )))
  );
END $$;
REVOKE ALL ON FUNCTION sorteos.admin_auth_session_valid(boolean) FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION sorteos.admin_auth_session_valid(boolean) FROM %I',r);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION sorteos.admin_auth_session_valid(boolean) TO sorteos_runtime;

-- Keep the financial authorization SECURITY INVOKER and all its original constraints.
CREATE OR REPLACE FUNCTION sorteos.assert_financial_admin() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE a sorteos.admin_users; verified_at numeric;
BEGIN
  SELECT * INTO a FROM sorteos.admin_users WHERE id=nullif(current_setting('app.actor_id',true),'')::uuid AND active;
  IF current_setting('app.actor_kind',true) IS DISTINCT FROM 'ADMIN' OR a.id IS NULL
    OR a.auth_user_id IS DISTINCT FROM nullif(current_setting('app.auth_user_id',true),'')::uuid THEN
    RAISE EXCEPTION 'Administrador no autorizado' USING ERRCODE='P0501';
  END IF;
  verified_at:=nullif(current_setting('app.mfa_verified_at',true),'')::numeric;
  IF verified_at IS NULL OR verified_at<extract(epoch FROM clock_timestamp())-900 OR verified_at>extract(epoch FROM clock_timestamp())+5 THEN
    RAISE EXCEPTION 'Reautenticacion MFA requerida' USING ERRCODE='P0503';
  END IF;
  IF NOT sorteos.admin_auth_session_valid(true) THEN
    RAISE EXCEPTION 'Sesion revocada o factor no vigente' USING ERRCODE='P0502';
  END IF;
END $$;

-- Runtime no longer reads Auth tables, even in environments where schema usage is possible.
DO $$ BEGIN
  IF to_regclass('auth.sessions') IS NOT NULL AND to_regclass('auth.mfa_factors') IS NOT NULL THEN
    REVOKE SELECT(id,user_id,not_after,aal,factor_id) ON auth.sessions FROM sorteos_runtime;
    REVOKE SELECT(id,user_id,status,factor_type) ON auth.mfa_factors FROM sorteos_runtime;
  END IF;
END $$;

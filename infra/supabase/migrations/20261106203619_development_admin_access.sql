-- Explicit, expiring server capability for development only. No browser access.
CREATE TABLE sorteos.development_admin_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES sorteos.admin_users(id),
  token_hash sorteos.sha256 NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at>created_at AND expires_at<=created_at+interval '8 hours')
);
ALTER TABLE sorteos.development_admin_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sorteos.development_admin_access FROM PUBLIC,sorteos_runtime;
CREATE POLICY no_runtime_access ON sorteos.development_admin_access TO sorteos_runtime USING(false) WITH CHECK(false);
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON sorteos.development_admin_access FROM %I',r);
    END IF;
  END LOOP;
END $$;
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sorteos.development_admin_access FOR EACH ROW EXECUTE FUNCTION sorteos.audit_write();
CREATE TRIGGER preserve_history BEFORE DELETE OR TRUNCATE ON sorteos.development_admin_access FOR EACH STATEMENT EXECUTE FUNCTION sorteos.reject_delete();

CREATE FUNCTION sorteos.development_mfa_access_valid() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT sorteos.admin_auth_session_valid(false) THEN RETURN false; END IF;
  RETURN EXISTS(SELECT 1 FROM sorteos.development_admin_access d
    WHERE d.admin_id=nullif(current_setting('app.actor_id',true),'')::uuid
      AND d.expires_at>clock_timestamp()
      AND d.token_hash=encode(sha256(convert_to(nullif(current_setting('app.development_mfa_token',true),''),'UTF8')),'hex'));
END $$;
REVOKE ALL ON FUNCTION sorteos.development_mfa_access_valid() FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION sorteos.development_mfa_access_valid() FROM %I',r);
    END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION sorteos.development_mfa_access_valid() TO sorteos_runtime;

CREATE OR REPLACE FUNCTION sorteos.assert_financial_admin() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE a sorteos.admin_users; verified_at numeric;
BEGIN
  SELECT * INTO a FROM sorteos.admin_users WHERE id=nullif(current_setting('app.actor_id',true),'')::uuid AND active;
  IF current_setting('app.actor_kind',true) IS DISTINCT FROM 'ADMIN' OR a.id IS NULL
    OR a.auth_user_id IS DISTINCT FROM nullif(current_setting('app.auth_user_id',true),'')::uuid THEN
    RAISE EXCEPTION 'Administrador no autorizado' USING ERRCODE='P0501';
  END IF;
  IF sorteos.development_mfa_access_valid() THEN
    INSERT INTO sorteos.audit_logs(actor_kind,actor_id,action,entity,entity_id,request_id)
      VALUES('ADMIN',a.id,'DEVELOPMENT_MFA_ACCESS','admin_users',a.id,
        coalesce(nullif(current_setting('app.request_id',true),'')::uuid,gen_random_uuid()));
    RETURN;
  END IF;
  verified_at:=nullif(current_setting('app.mfa_verified_at',true),'')::numeric;
  IF verified_at IS NULL OR verified_at<extract(epoch FROM clock_timestamp())-900 OR verified_at>extract(epoch FROM clock_timestamp())+5 THEN
    RAISE EXCEPTION 'Reautenticacion MFA requerida' USING ERRCODE='P0503';
  END IF;
  IF NOT sorteos.admin_auth_session_valid(true) THEN
    RAISE EXCEPTION 'Sesion revocada o factor no vigente' USING ERRCODE='P0502';
  END IF;
END $$;

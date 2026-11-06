-- Guest checkout may use explicitly marked DEMO accounts only through a server capability.
CREATE FUNCTION sorteos.development_checkout_valid() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF current_setting('role',true) IS DISTINCT FROM 'sorteos_runtime' THEN RETURN false; END IF;
  RETURN EXISTS(SELECT 1 FROM sorteos.development_admin_access d JOIN sorteos.admin_users a ON a.id=d.admin_id
    WHERE a.active AND a.role='OWNER' AND d.expires_at>clock_timestamp()
      AND d.token_hash=encode(sha256(convert_to(nullif(current_setting('app.development_mfa_token',true),''),'UTF8')),'hex'));
END $$;
REVOKE ALL ON FUNCTION sorteos.development_checkout_valid() FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON FUNCTION sorteos.development_checkout_valid() FROM %I',r); END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION sorteos.development_checkout_valid() TO sorteos_runtime;

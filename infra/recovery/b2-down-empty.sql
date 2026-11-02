-- Solo instalaciones vacías; con datos usar una migración correctiva.
DO $$ DECLARE t text; has_data boolean; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback B2 bloqueado: hay datos'; END IF;
  END LOOP;
END $$;
DROP TRIGGER zz_publication_guard ON sorteos.raffles;
DROP TRIGGER media_deleted ON sorteos.raffle_media;
DROP FUNCTION sorteos.publication_guard();
DROP FUNCTION sorteos.audit_media_delete();
DROP INDEX sorteos.raffles_catalog;
ALTER TABLE sorteos.raffles DROP COLUMN version, DROP COLUMN publication_approved_at,
  DROP COLUMN publication_approved_by, DROP COLUMN approved_rules_version;
ALTER TABLE sorteos.raffle_media DROP CONSTRAINT public_prize_key, DROP COLUMN rights_confirmed;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media','tickets','checkout_holds','bank_accounts','admin_users'] LOOP
    EXECUTE format('DROP POLICY runtime_read ON sorteos.%I',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media','tickets','audit_logs'] LOOP
    EXECUTE format('DROP POLICY runtime_insert ON sorteos.%I',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media'] LOOP
    EXECUTE format('DROP POLICY runtime_update ON sorteos.%I',t);
  END LOOP;
END $$;
DROP POLICY runtime_delete_media ON sorteos.raffle_media;
REVOKE ALL ON ALL TABLES IN SCHEMA sorteos FROM sorteos_runtime;
REVOKE SELECT(id,raffle_id,status,expires_at) ON sorteos.checkout_holds FROM sorteos_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sorteos FROM sorteos_runtime;
REVOKE ALL ON SCHEMA sorteos FROM sorteos_runtime;
-- El rol NOLOGIN puede estar compartido por otras bases: no eliminarlo ni tocar membresías.
-- Reparar exclusivamente el historial de esta DB con el CLI oficial después del down.

-- Solo base vacía de negocio, nunca borrar auditoría para forzar esta recuperación.
DO $$ DECLARE t text; has_data boolean; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback B5 bloqueado: hay datos (M5 requiere corrección hacia adelante)'; END IF;
  END LOOP;
END $$;
DROP TRIGGER raffle_close_guard ON sorteos.raffles;
DROP FUNCTION sorteos.guard_raffle_close();
ALTER TABLE sorteos.audit_logs DROP COLUMN metadata;

-- Recuperación SOLO para una instalación vacía. No borrar histórico ni DEMO.
DO $$
DECLARE t text; has_data boolean;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback bloqueado: el esquema contiene datos'; END IF;
  END LOOP;
END $$;
DROP SCHEMA sorteos CASCADE;
-- El CLI sigue siendo el propietario del historial: después de recuperación
-- autorizada, migration repair <version> --status reverted en esa misma DB.

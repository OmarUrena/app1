-- Ejecutar en transacción únicamente sin datos, antes de revertir B2.
DO $$ DECLARE t text; has_data boolean; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback B3 bloqueado: hay datos'; END IF;
  END LOOP;
END $$;
DROP TRIGGER zz_checkout_b3 ON sorteos.checkout_holds;
DROP FUNCTION sorteos.guard_checkout_b3();
DROP TABLE sorteos.checkout_limits;
DROP POLICY runtime_read ON sorteos.guest_sessions;
DROP POLICY runtime_insert ON sorteos.guest_sessions;
DROP POLICY runtime_update ON sorteos.guest_sessions;
DROP POLICY runtime_insert ON sorteos.checkout_holds;
DROP POLICY runtime_update ON sorteos.checkout_holds;
DROP POLICY runtime_update ON sorteos.tickets;
DROP POLICY runtime_hold_check ON sorteos.orders;
REVOKE SELECT,INSERT ON sorteos.guest_sessions FROM sorteos_runtime;
REVOKE UPDATE(expires_at) ON sorteos.guest_sessions FROM sorteos_runtime;
REVOKE SELECT,INSERT ON sorteos.checkout_holds FROM sorteos_runtime;
REVOKE UPDATE(status) ON sorteos.checkout_holds FROM sorteos_runtime;
REVOKE UPDATE(status,hold_id) ON sorteos.tickets FROM sorteos_runtime;
REVOKE SELECT(hold_id) ON sorteos.orders FROM sorteos_runtime;
ALTER TABLE sorteos.checkout_holds DROP COLUMN abuse_key_hash;
DROP INDEX sorteos.holds_session_active;
GRANT SELECT(id,raffle_id,status,expires_at) ON sorteos.checkout_holds TO sorteos_runtime;

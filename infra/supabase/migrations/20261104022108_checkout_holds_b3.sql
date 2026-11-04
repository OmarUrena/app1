-- B3. Solo el servidor puede operar sesiones, límites y pre-reservas.
ALTER TABLE sorteos.checkout_holds ADD COLUMN abuse_key_hash sorteos.sha256;
CREATE INDEX holds_session_active ON sorteos.checkout_holds(session_id,expires_at) WHERE status='ACTIVE';
CREATE INDEX holds_abuse_active ON sorteos.checkout_holds(abuse_key_hash,expires_at) WHERE status='ACTIVE';
CREATE TABLE sorteos.checkout_limits (
  key text PRIMARY KEY CHECK (key ~ '^(session|hold):[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL CHECK (attempts > 0)
);
ALTER TABLE sorteos.checkout_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sorteos.checkout_limits FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
      EXECUTE format('REVOKE ALL ON sorteos.checkout_limits FROM %I',r);
    END IF;
  END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON sorteos.checkout_limits TO sorteos_runtime;
CREATE POLICY runtime_limits ON sorteos.checkout_limits TO sorteos_runtime USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON sorteos.guest_sessions TO sorteos_runtime;
GRANT UPDATE(expires_at) ON sorteos.guest_sessions TO sorteos_runtime;
CREATE POLICY runtime_read ON sorteos.guest_sessions FOR SELECT TO sorteos_runtime USING(true);
CREATE POLICY runtime_insert ON sorteos.guest_sessions FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_update ON sorteos.guest_sessions FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON sorteos.checkout_holds TO sorteos_runtime;
GRANT UPDATE(status) ON sorteos.checkout_holds TO sorteos_runtime;
CREATE POLICY runtime_insert ON sorteos.checkout_holds FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_update ON sorteos.checkout_holds FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
GRANT UPDATE(status,hold_id) ON sorteos.tickets TO sorteos_runtime;
CREATE POLICY runtime_update ON sorteos.tickets FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
-- validate_commit comprueba que un hold liberado no tenga una orden.
GRANT SELECT(hold_id) ON sorteos.orders TO sorteos_runtime;
CREATE POLICY runtime_hold_check ON sorteos.orders FOR SELECT TO sorteos_runtime USING(true);
CREATE FUNCTION sorteos.guard_checkout_b3() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user='sorteos_runtime' AND (NEW.abuse_key_hash IS NULL
    OR NEW.expires_at>now()+interval '12 hours'
    OR NOT EXISTS(SELECT 1 FROM sorteos.guest_sessions WHERE id=NEW.session_id AND expires_at>=NEW.expires_at)
    OR NOT EXISTS(SELECT 1 FROM sorteos.raffles WHERE id=NEW.raffle_id AND status='PUBLISHED'
      AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now()))) THEN
    RAISE EXCEPTION 'Checkout no elegible' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_checkout_b3 BEFORE INSERT ON sorteos.checkout_holds FOR EACH ROW EXECUTE FUNCTION sorteos.guard_checkout_b3();
REVOKE EXECUTE ON FUNCTION sorteos.guard_checkout_b3() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sorteos.guard_checkout_b3() TO sorteos_runtime;

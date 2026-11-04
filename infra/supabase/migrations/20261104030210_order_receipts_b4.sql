-- B4: escrituras de orden desde NestJS, Storage privado con staging durable.
ALTER TABLE sorteos.customers ADD CONSTRAINT customer_email_required CHECK(email IS NOT NULL) NOT VALID;
CREATE TABLE sorteos.receipt_staging (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sorteos.guest_sessions(id),
  storage_path text NOT NULL UNIQUE CHECK(storage_path ~ '^pending/[0-9a-f-]+\.(jpg|png|pdf)$'),
  sha256 sorteos.sha256 NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ATTACHED','CLEANING','CLEANED')),
  order_id uuid UNIQUE REFERENCES sorteos.orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cleanup_after timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  CHECK((status='ATTACHED')=(order_id IS NOT NULL))
);
CREATE INDEX staging_cleanup ON sorteos.receipt_staging(cleanup_after) WHERE status IN ('PENDING','CLEANING');
CREATE INDEX staging_session ON sorteos.receipt_staging(session_id,created_at);
ALTER TABLE sorteos.receipt_staging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sorteos.receipt_staging FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON sorteos.receipt_staging FROM %I',r); END IF;
  END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE ON sorteos.receipt_staging TO sorteos_runtime;
CREATE POLICY runtime_staging ON sorteos.receipt_staging TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sorteos.receipt_staging FOR EACH ROW EXECUTE FUNCTION sorteos.audit_write();
CREATE TRIGGER no_delete BEFORE DELETE ON sorteos.receipt_staging FOR EACH ROW EXECUTE FUNCTION sorteos.reject_delete();
GRANT SELECT,INSERT ON sorteos.orders,sorteos.order_tickets TO sorteos_runtime;
GRANT INSERT ON sorteos.customers,sorteos.payment_reports TO sorteos_runtime;
GRANT SELECT(id,email) ON sorteos.customers TO sorteos_runtime;
GRANT SELECT(id,order_id,active,status,verified_amount_minor,receipt_storage_path,receipt_sha256) ON sorteos.payment_reports TO sorteos_runtime;
GRANT UPDATE(current_order_id) ON sorteos.tickets TO sorteos_runtime;
CREATE POLICY runtime_insert ON sorteos.orders FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_insert ON sorteos.order_tickets FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_read ON sorteos.order_tickets FOR SELECT TO sorteos_runtime USING(true);
CREATE POLICY runtime_insert ON sorteos.customers FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_read ON sorteos.customers FOR SELECT TO sorteos_runtime USING(true);
CREATE POLICY runtime_insert ON sorteos.payment_reports FOR INSERT TO sorteos_runtime WITH CHECK(true);
CREATE POLICY runtime_read ON sorteos.payment_reports FOR SELECT TO sorteos_runtime USING(true);
CREATE FUNCTION sorteos.guard_receipt_staging() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF (NEW.id,NEW.session_id,NEW.storage_path,NEW.sha256,NEW.created_at) IS DISTINCT FROM
     (OLD.id,OLD.session_id,OLD.storage_path,OLD.sha256,OLD.created_at)
    OR (NEW.status<>OLD.status AND NOT ((OLD.status='PENDING' AND NEW.status IN ('ATTACHED','CLEANING')) OR
      (OLD.status='CLEANING' AND NEW.status='CLEANED')))
    OR (OLD.status='ATTACHED' AND NEW.order_id IS DISTINCT FROM OLD.order_id) THEN
    RAISE EXCEPTION 'Staging inmutable o transición inválida' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER staging_guard BEFORE UPDATE ON sorteos.receipt_staging FOR EACH ROW EXECUTE FUNCTION sorteos.guard_receipt_staging();
CREATE FUNCTION sorteos.order_receipt_b4() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user='sorteos_runtime' AND (NOT EXISTS(SELECT 1 FROM sorteos.customers WHERE id=NEW.customer_id AND email IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM sorteos.payment_reports p JOIN sorteos.receipt_staging s
      ON s.storage_path=p.receipt_storage_path AND s.sha256=p.receipt_sha256
      WHERE p.order_id=NEW.id AND p.active AND s.status='ATTACHED' AND s.order_id=NEW.id AND s.session_id=NEW.session_id)) THEN
    RAISE EXCEPTION 'Orden requiere correo y comprobante privado adjunto' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER order_receipt_b4 AFTER INSERT ON sorteos.orders DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION sorteos.order_receipt_b4();
REVOKE EXECUTE ON FUNCTION sorteos.guard_receipt_staging(),sorteos.order_receipt_b4() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sorteos.guard_receipt_staging(),sorteos.order_receipt_b4() TO sorteos_runtime;

-- Solo en DB vacía y transacción; con datos, corrección forward-only.
DO $$ DECLARE t text; has_data boolean; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback B4 bloqueado: hay datos'; END IF;
  END LOOP;
END $$;
DROP TRIGGER order_receipt_b4 ON sorteos.orders;
DROP FUNCTION sorteos.order_receipt_b4();
DROP TABLE sorteos.receipt_staging;
DROP FUNCTION sorteos.guard_receipt_staging();
ALTER TABLE sorteos.customers DROP CONSTRAINT customer_email_required;
DROP POLICY runtime_insert ON sorteos.orders;
DROP POLICY runtime_insert ON sorteos.order_tickets;
DROP POLICY runtime_read ON sorteos.order_tickets;
DROP POLICY runtime_insert ON sorteos.customers;
DROP POLICY runtime_read ON sorteos.customers;
DROP POLICY runtime_insert ON sorteos.payment_reports;
DROP POLICY runtime_read ON sorteos.payment_reports;
REVOKE SELECT,INSERT ON sorteos.orders,sorteos.order_tickets FROM sorteos_runtime;
REVOKE INSERT ON sorteos.customers,sorteos.payment_reports FROM sorteos_runtime;
REVOKE SELECT(id,email) ON sorteos.customers FROM sorteos_runtime;
REVOKE SELECT(id,order_id,active,status,verified_amount_minor,receipt_storage_path,receipt_sha256) ON sorteos.payment_reports FROM sorteos_runtime;
REVOKE UPDATE(current_order_id) ON sorteos.tickets FROM sorteos_runtime;

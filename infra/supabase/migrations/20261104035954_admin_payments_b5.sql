-- B5. Acciones de conciliación inmutables, autorización real y mínimos de Auth.
CREATE TABLE sorteos.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES sorteos.admin_users(id),
  order_id uuid NOT NULL REFERENCES sorteos.orders(id),
  idempotency_key uuid NOT NULL,
  request_hash sorteos.sha256 NOT NULL,
  action text NOT NULL CHECK(action IN ('START_REVIEW','APPROVE','REQUEST_RESOLUTION','CANCEL')),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id,idempotency_key)
);
CREATE INDEX admin_actions_order_created ON sorteos.admin_actions(order_id,created_at,id);
ALTER TABLE sorteos.admin_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sorteos.admin_actions FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON sorteos.admin_actions FROM %I',r); END IF;
  END LOOP;
END $$;
GRANT SELECT,INSERT ON sorteos.admin_actions TO sorteos_runtime;
CREATE POLICY runtime_actions ON sorteos.admin_actions TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE TRIGGER audit AFTER INSERT ON sorteos.admin_actions FOR EACH ROW EXECUTE FUNCTION sorteos.audit_write();
CREATE TRIGGER preserve_history BEFORE UPDATE OR DELETE OR TRUNCATE ON sorteos.admin_actions FOR EACH STATEMENT EXECUTE FUNCTION sorteos.reject_delete();
GRANT SELECT(name,phone,created_at) ON sorteos.customers TO sorteos_runtime;
GRANT SELECT(bank_account_id,reference,reported_at,transfer_date,bank_posted_at,bank_confirmation_reference,reviewer_id,reviewed_at,resolution_note)
  ON sorteos.payment_reports TO sorteos_runtime;
GRANT UPDATE(status,reviewed_at,reviewed_by,cancel_reason,resolution_type,evidence_reference) ON sorteos.orders TO sorteos_runtime;
GRANT UPDATE(status,verified_amount_minor,bank_posted_at,bank_confirmation_reference,reviewer_id,reviewed_at,resolution_note)
  ON sorteos.payment_reports TO sorteos_runtime;
GRANT UPDATE(released_at) ON sorteos.order_tickets TO sorteos_runtime;
GRANT SELECT,INSERT,UPDATE ON sorteos.payment_incidents TO sorteos_runtime;
GRANT SELECT ON sorteos.audit_logs TO sorteos_runtime;
CREATE POLICY runtime_update ON sorteos.orders FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_update ON sorteos.payment_reports FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_update ON sorteos.order_tickets FOR UPDATE TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_incidents ON sorteos.payment_incidents TO sorteos_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_audit_read ON sorteos.audit_logs FOR SELECT TO sorteos_runtime USING(true);
-- Las tablas Auth se administran por Supabase: solo columnas sin credenciales y
-- políticas SELECT propias para el usuario/sesión comprobados por el servidor.
DO $$ BEGIN
  IF to_regclass('auth.sessions') IS NOT NULL AND to_regclass('auth.mfa_factors') IS NOT NULL THEN
    GRANT USAGE ON SCHEMA auth TO sorteos_runtime;
    GRANT SELECT(id,user_id,not_after,aal,factor_id) ON auth.sessions TO sorteos_runtime;
    GRANT SELECT(id,user_id,status,factor_type) ON auth.mfa_factors TO sorteos_runtime;
    CREATE POLICY sorteos_b5_session_read ON auth.sessions FOR SELECT TO sorteos_runtime
      USING(id=nullif(current_setting('app.auth_session_id',true),'')::uuid AND user_id=nullif(current_setting('app.auth_user_id',true),'')::uuid);
    CREATE POLICY sorteos_b5_factor_read ON auth.mfa_factors FOR SELECT TO sorteos_runtime
      USING(user_id=nullif(current_setting('app.auth_user_id',true),'')::uuid);
  END IF;
END $$;
CREATE FUNCTION sorteos.assert_financial_admin() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE a sorteos.admin_users; verified_at numeric;
BEGIN
  SELECT * INTO a FROM sorteos.admin_users WHERE id=nullif(current_setting('app.actor_id',true),'')::uuid AND active;
  IF current_setting('app.actor_kind',true) IS DISTINCT FROM 'ADMIN' OR a.id IS NULL
    OR a.auth_user_id IS DISTINCT FROM nullif(current_setting('app.auth_user_id',true),'')::uuid THEN
    RAISE EXCEPTION 'Administrador no autorizado' USING ERRCODE='P0501';
  END IF;
  verified_at:=nullif(current_setting('app.mfa_verified_at',true),'')::numeric;
  IF verified_at IS NULL OR verified_at<extract(epoch FROM clock_timestamp())-900 OR verified_at>extract(epoch FROM clock_timestamp())+5 THEN
    RAISE EXCEPTION 'Reautenticación MFA requerida' USING ERRCODE='P0503';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.mfa_factors f ON f.id=s.factor_id AND f.user_id=s.user_id
    WHERE s.id=nullif(current_setting('app.auth_session_id',true),'')::uuid AND s.user_id=a.auth_user_id
      AND (s.not_after IS NULL OR s.not_after>clock_timestamp()) AND s.aal::text='aal2'
      AND f.status::text='verified' AND f.factor_type::text='totp') THEN
    RAISE EXCEPTION 'Sesión revocada o factor no vigente' USING ERRCODE='P0502';
  END IF;
END $$;
CREATE FUNCTION sorteos.guard_financial_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user='sorteos_runtime' AND (TG_TABLE_NAME IN ('orders','payment_reports','order_tickets','payment_incidents')
    OR (TG_TABLE_NAME='tickets' AND to_jsonb(OLD)->>'status'='RESERVED' AND to_jsonb(NEW)->>'status' IN ('AVAILABLE','SOLD'))) THEN
    PERFORM sorteos.assert_financial_admin();
    IF TG_TABLE_NAME='payment_reports' AND to_jsonb(OLD)->>'status' IN ('VERIFIED','REFUNDED')
      AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
      RAISE EXCEPTION 'Reporte conciliado inmutable' USING ERRCODE='23514';
    END IF;
    IF ((TG_TABLE_NAME='orders' AND to_jsonb(NEW)->>'status' IN ('PAID','CANCELLED')) OR
      (TG_TABLE_NAME='payment_reports' AND to_jsonb(NEW)->>'status' IN ('VERIFIED','REFUNDED')))
      AND NOT EXISTS(SELECT 1 FROM sorteos.admin_users WHERE id=nullif(current_setting('app.actor_id',true),'')::uuid AND active AND role='OWNER') THEN
      RAISE EXCEPTION 'Solo propietario concilia' USING ERRCODE='P0501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['orders','payment_reports','order_tickets','payment_incidents','tickets'] LOOP
    EXECUTE format('CREATE TRIGGER financial_guard BEFORE UPDATE ON sorteos.%I FOR EACH ROW EXECUTE FUNCTION sorteos.guard_financial_change()',t);
  END LOOP;
END $$;
CREATE TRIGGER financial_insert_guard BEFORE INSERT ON sorteos.payment_incidents FOR EACH ROW EXECUTE FUNCTION sorteos.guard_financial_change();
CREATE FUNCTION sorteos.guard_admin_action() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM sorteos.assert_financial_admin();
  IF NEW.admin_id IS DISTINCT FROM nullif(current_setting('app.actor_id',true),'')::uuid
    OR (NEW.action IN ('APPROVE','CANCEL') AND NOT EXISTS(SELECT 1 FROM sorteos.admin_users WHERE id=NEW.admin_id AND active AND role='OWNER')) THEN
    RAISE EXCEPTION 'Actor no coincide' USING ERRCODE='P0501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER action_actor BEFORE INSERT ON sorteos.admin_actions FOR EACH ROW EXECUTE FUNCTION sorteos.guard_admin_action();
CREATE FUNCTION sorteos.validate_financial_commit() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE o sorteos.orders;
BEGIN
  IF current_user='sorteos_runtime' THEN
    SELECT * INTO STRICT o FROM sorteos.orders WHERE id=(to_jsonb(NEW)->>CASE WHEN TG_TABLE_NAME='orders' THEN 'id' ELSE 'order_id' END)::uuid;
    IF NOT EXISTS(SELECT 1 FROM sorteos.admin_actions WHERE id=nullif(current_setting('app.admin_action_id',true),'')::uuid
      AND order_id=o.id AND admin_id=nullif(current_setting('app.actor_id',true),'')::uuid
      AND (result->>'version')::integer=o.version AND result->>'status'=o.status::text)
      OR (o.status IN ('PAID','CANCELLED') AND EXISTS(SELECT 1 FROM sorteos.payment_incidents WHERE order_id=o.id AND status<>'RESOLVED'))
      OR (o.status='CANCELLED' AND NOT EXISTS(SELECT 1 FROM sorteos.payment_reports WHERE order_id=o.id AND active
        AND status=CASE WHEN o.resolution_type='REFUNDED' THEN 'REFUNDED'::sorteos.payment_status ELSE 'INVALID'::sorteos.payment_status END)) THEN
      RAISE EXCEPTION 'Conciliación sin acción, evidencia o resolución' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER financial_commit AFTER UPDATE ON sorteos.orders DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION sorteos.validate_financial_commit();
CREATE CONSTRAINT TRIGGER financial_commit AFTER UPDATE ON sorteos.payment_reports DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sorteos.validate_financial_commit();
CREATE CONSTRAINT TRIGGER financial_commit AFTER UPDATE ON sorteos.order_tickets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sorteos.validate_financial_commit();
REVOKE EXECUTE ON FUNCTION sorteos.assert_financial_admin(),sorteos.guard_financial_change(),sorteos.guard_admin_action(),sorteos.validate_financial_commit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sorteos.assert_financial_admin(),sorteos.guard_financial_change(),sorteos.guard_admin_action(),sorteos.validate_financial_commit() TO sorteos_runtime;

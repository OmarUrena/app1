-- Transacción y cero datos de negocio. No borra sesiones/factores de Supabase.
DO $$ DECLARE t text; has_data boolean; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='sorteos' LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM sorteos.%I)',t) INTO has_data;
    IF has_data THEN RAISE EXCEPTION 'Rollback B5 bloqueado: hay datos'; END IF;
  END LOOP;
END $$;
DROP TABLE sorteos.admin_actions;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['orders','payment_reports','order_tickets','payment_incidents','tickets'] LOOP
    EXECUTE format('DROP TRIGGER financial_guard ON sorteos.%I',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['orders','payment_reports','order_tickets'] LOOP
    EXECUTE format('DROP TRIGGER financial_commit ON sorteos.%I',t);
  END LOOP;
END $$;
DROP TRIGGER financial_insert_guard ON sorteos.payment_incidents;
DROP FUNCTION sorteos.validate_financial_commit(),sorteos.guard_admin_action(),sorteos.guard_financial_change(),sorteos.assert_financial_admin();
DROP FUNCTION IF EXISTS sorteos.admin_auth_session_valid(boolean);
DROP FUNCTION IF EXISTS sorteos.development_mfa_access_valid();
DROP FUNCTION IF EXISTS sorteos.development_checkout_valid();
DROP TABLE IF EXISTS sorteos.development_admin_access;
DROP POLICY runtime_update ON sorteos.orders;
DROP POLICY runtime_update ON sorteos.payment_reports;
DROP POLICY runtime_update ON sorteos.order_tickets;
DROP POLICY runtime_incidents ON sorteos.payment_incidents;
DROP POLICY runtime_audit_read ON sorteos.audit_logs;
REVOKE SELECT(name,phone,created_at) ON sorteos.customers FROM sorteos_runtime;
REVOKE SELECT(bank_account_id,reference,reported_at,transfer_date,bank_posted_at,bank_confirmation_reference,reviewer_id,reviewed_at,resolution_note) ON sorteos.payment_reports FROM sorteos_runtime;
REVOKE UPDATE(status,reviewed_at,reviewed_by,cancel_reason,resolution_type,evidence_reference) ON sorteos.orders FROM sorteos_runtime;
REVOKE UPDATE(status,verified_amount_minor,bank_posted_at,bank_confirmation_reference,reviewer_id,reviewed_at,resolution_note) ON sorteos.payment_reports FROM sorteos_runtime;
REVOKE UPDATE(released_at) ON sorteos.order_tickets FROM sorteos_runtime;
REVOKE SELECT,INSERT,UPDATE ON sorteos.payment_incidents FROM sorteos_runtime;
REVOKE SELECT ON sorteos.audit_logs FROM sorteos_runtime;
DO $$ BEGIN
  IF to_regclass('auth.sessions') IS NOT NULL AND to_regclass('auth.mfa_factors') IS NOT NULL THEN
    DROP POLICY sorteos_b5_session_read ON auth.sessions;
    DROP POLICY sorteos_b5_factor_read ON auth.mfa_factors;
    REVOKE SELECT(id,user_id,not_after,aal,factor_id) ON auth.sessions FROM sorteos_runtime;
    REVOKE SELECT(id,user_id,status,factor_type) ON auth.mfa_factors FROM sorteos_runtime;
    REVOKE USAGE ON SCHEMA auth FROM sorteos_runtime;
  END IF;
END $$;

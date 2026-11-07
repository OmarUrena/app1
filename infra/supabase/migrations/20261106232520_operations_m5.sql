-- M5: cierre sin transferencias a medio completar; ninguna liberación de reservas.
ALTER TABLE sorteos.audit_logs ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(metadata)='object');
CREATE FUNCTION sorteos.guard_raffle_close() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF OLD.status='CLOSED' AND NEW.status<>OLD.status THEN
    RAISE EXCEPTION 'Cierre irreversible' USING ERRCODE='23514';
  END IF;
  IF NEW.status='CLOSED' AND OLD.status<>'CLOSED' THEN
    PERFORM sorteos.assert_financial_admin();
    IF NOT EXISTS(SELECT 1 FROM sorteos.admin_users WHERE id=nullif(current_setting('app.actor_id',true),'')::uuid AND active AND role='OWNER') THEN
      RAISE EXCEPTION 'Solo el propietario puede cerrar' USING ERRCODE='P0501';
    END IF;
    IF OLD.status<>'PAUSED' OR EXISTS(SELECT 1 FROM sorteos.checkout_holds
      WHERE raffle_id=OLD.id AND status='ACTIVE' AND expires_at>now()) THEN
      RAISE EXCEPTION 'Pausar y esperar los holds vigentes' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sorteos.guard_raffle_close() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sorteos.guard_raffle_close() TO sorteos_runtime;
CREATE TRIGGER raffle_close_guard BEFORE UPDATE ON sorteos.raffles
  FOR EACH ROW EXECUTE FUNCTION sorteos.guard_raffle_close();

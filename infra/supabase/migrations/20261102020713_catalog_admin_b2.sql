-- B2: rol de servidor sin login, sin acceso del navegador y sin privilegios contables.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sorteos_runtime') THEN
    CREATE ROLE sorteos_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sorteos_runtime'
    AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
    RAISE EXCEPTION 'sorteos_runtime debe ser un rol sin login ni privilegios elevados';
  END IF;
END $$;
GRANT sorteos_runtime TO CURRENT_USER;
GRANT USAGE ON SCHEMA sorteos TO sorteos_runtime;
GRANT SELECT ON sorteos.raffles, sorteos.raffle_media, sorteos.tickets,
  sorteos.bank_accounts, sorteos.admin_users TO sorteos_runtime;
GRANT SELECT(id,raffle_id,status,expires_at) ON sorteos.checkout_holds TO sorteos_runtime;
GRANT INSERT, UPDATE ON sorteos.raffles TO sorteos_runtime;
GRANT INSERT, UPDATE, DELETE ON sorteos.raffle_media TO sorteos_runtime;
GRANT INSERT ON sorteos.tickets, sorteos.audit_logs TO sorteos_runtime;
GRANT USAGE ON TYPE sorteos.raffle_status,sorteos.ticket_status,sorteos.hold_status,
  sorteos.order_status,sorteos.payment_status TO sorteos_runtime;
GRANT USAGE ON DOMAIN sorteos.sha256,sorteos.positive_minor TO sorteos_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sorteos TO sorteos_runtime;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media','tickets','checkout_holds','bank_accounts','admin_users'] LOOP
    EXECUTE format('CREATE POLICY runtime_read ON sorteos.%I FOR SELECT TO sorteos_runtime USING (true)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media','tickets','audit_logs'] LOOP
    EXECUTE format('CREATE POLICY runtime_insert ON sorteos.%I FOR INSERT TO sorteos_runtime WITH CHECK (true)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['raffles','raffle_media'] LOOP
    EXECUTE format('CREATE POLICY runtime_update ON sorteos.%I FOR UPDATE TO sorteos_runtime USING (true) WITH CHECK (true)',t);
  END LOOP;
END $$;
CREATE POLICY runtime_delete_media ON sorteos.raffle_media FOR DELETE TO sorteos_runtime USING (true);

ALTER TABLE sorteos.raffles ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN publication_approved_at timestamptz,
  ADD COLUMN publication_approved_by uuid REFERENCES sorteos.admin_users(id),
  ADD COLUMN approved_rules_version text;
CREATE INDEX raffles_publication_reviewer ON sorteos.raffles(publication_approved_by);
CREATE INDEX raffles_catalog ON sorteos.raffles(status, created_at DESC, id);
ALTER TABLE sorteos.raffle_media ADD COLUMN rights_confirmed boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT public_prize_key CHECK (storage_key ~* '^(prizes|raffles)/[a-z0-9_./-]+\.(jpg|jpeg|png|webp|avif)$');

CREATE FUNCTION sorteos.publication_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'PUBLISHED' AND (NEW.publication_approved_at IS NULL OR NEW.publication_approved_by IS NULL
    OR NEW.approved_rules_version IS DISTINCT FROM NEW.rules_version
    OR NOT EXISTS (SELECT 1 FROM sorteos.admin_users WHERE id=NEW.publication_approved_by AND role='OWNER' AND active)
    OR NOT EXISTS (SELECT 1 FROM sorteos.raffle_media WHERE raffle_id=NEW.id AND rights_confirmed)
    OR EXISTS (SELECT 1 FROM sorteos.raffle_media WHERE raffle_id=NEW.id AND NOT rights_confirmed)) THEN
    RAISE EXCEPTION 'Publicacion requiere aprobacion y medios propios' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN NEW.version := OLD.version+1; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_publication_guard BEFORE INSERT OR UPDATE ON sorteos.raffles
FOR EACH ROW EXECUTE FUNCTION sorteos.publication_guard();
GRANT EXECUTE ON FUNCTION sorteos.publication_guard() TO sorteos_runtime;
REVOKE EXECUTE ON FUNCTION sorteos.publication_guard() FROM PUBLIC;

CREATE FUNCTION sorteos.audit_media_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO sorteos.audit_logs(actor_kind,actor_id,action,entity,entity_id,request_id)
  VALUES (coalesce(nullif(current_setting('app.actor_kind',true),''),'SYSTEM'),
    nullif(current_setting('app.actor_id',true),'')::uuid,'DELETE','raffle_media',OLD.id,
    coalesce(nullif(current_setting('app.request_id',true),'')::uuid,gen_random_uuid()));
  RETURN OLD;
END $$;
CREATE TRIGGER media_deleted AFTER DELETE ON sorteos.raffle_media FOR EACH ROW EXECUTE FUNCTION sorteos.audit_media_delete();
GRANT EXECUTE ON FUNCTION sorteos.audit_media_delete() TO sorteos_runtime;
REVOKE EXECUTE ON FUNCTION sorteos.audit_media_delete() FROM PUBLIC;

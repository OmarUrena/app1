-- B1. Esquema privado; ninguna tabla de negocio se expone al navegador.
CREATE SCHEMA sorteos;
REVOKE ALL ON SCHEMA sorteos FROM PUBLIC;

CREATE TYPE sorteos.raffle_status AS ENUM ('DRAFT','PUBLISHED','PAUSED','CLOSED','DRAWN');
CREATE TYPE sorteos.ticket_status AS ENUM ('AVAILABLE','HELD','RESERVED','SOLD');
CREATE TYPE sorteos.hold_status AS ENUM ('ACTIVE','CONSUMED','EXPIRED','CANCELLED');
CREATE TYPE sorteos.order_status AS ENUM ('PENDING_REVIEW','UNDER_REVIEW','NEEDS_RESOLUTION','PAID','CANCELLED');
CREATE TYPE sorteos.payment_status AS ENUM ('REPORTED','UNDER_REVIEW','VERIFIED','DISPUTED','INVALID','REFUNDED');
CREATE DOMAIN sorteos.sha256 AS text CHECK (VALUE ~ '^[0-9a-f]{64}$');
CREATE DOMAIN sorteos.positive_minor AS bigint CHECK (VALUE BETWEEN 1 AND 9007199254740991);

CREATE TABLE sorteos.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('OWNER','ADMIN')),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_owner ON sorteos.admin_users (role) WHERE role = 'OWNER';

CREATE TABLE sorteos.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_hash sorteos.sha256 NOT NULL UNIQUE,
  abuse_key_hash sorteos.sha256,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX guest_sessions_expiry ON sorteos.guest_sessions (expires_at);

CREATE TABLE sorteos.raffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 180),
  description text NOT NULL CHECK (length(description) <= 20000),
  prize text NOT NULL CHECK (length(btrim(prize)) BETWEEN 1 AND 2000),
  total_tickets integer NOT NULL CHECK (total_tickets BETWEEN 1 AND 1000000),
  ticket_width integer GENERATED ALWAYS AS (length((total_tickets - 1)::text)) STORED,
  ticket_price_minor sorteos.positive_minor NOT NULL,
  min_purchase integer NOT NULL CHECK (min_purchase > 0),
  max_purchase integer NOT NULL,
  rules text NOT NULL CHECK (length(btrim(rules)) BETWEEN 1 AND 20000),
  rules_version text NOT NULL CHECK (length(btrim(rules_version)) BETWEEN 1 AND 100),
  starts_at timestamptz,
  ends_at timestamptz,
  status sorteos.raffle_status NOT NULL DEFAULT 'DRAFT',
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_purchase BETWEEN min_purchase AND total_tickets),
  CHECK (ticket_price_minor::numeric * max_purchase <= 9007199254740991),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE sorteos.raffle_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES sorteos.raffles(id),
  storage_key text NOT NULL CHECK (storage_key !~ '(^/|://|\.\.)'),
  alt text NOT NULL CHECK (length(btrim(alt)) BETWEEN 1 AND 500),
  position integer NOT NULL CHECK (position >= 0),
  UNIQUE (raffle_id, position)
);

CREATE TABLE sorteos.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  holder_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('SAVINGS','CHECKING','DEMO')),
  account_display text NOT NULL CHECK (length(btrim(account_display)) BETWEEN 1 AND 150),
  currency text NOT NULL DEFAULT 'DOP' CHECK (currency = 'DOP'),
  active boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT is_demo OR NOT active)
);

CREATE TABLE sorteos.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 180),
  phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text CHECK (length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Un teléfono no es identidad: no se impone UNIQUE(phone).

CREATE TABLE sorteos.checkout_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES sorteos.raffles(id),
  session_id uuid NOT NULL REFERENCES sorteos.guest_sessions(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_minor_snapshot sorteos.positive_minor NOT NULL,
  rules_version_snapshot text NOT NULL,
  expires_at timestamptz NOT NULL,
  status sorteos.hold_status NOT NULL DEFAULT 'ACTIVE',
  idempotency_key uuid NOT NULL,
  request_hash sorteos.sha256 NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, raffle_id),
  UNIQUE (session_id, idempotency_key),
  CHECK (expires_at > created_at),
  CHECK (quantity::numeric * unit_price_minor_snapshot <= 9007199254740991)
);
CREATE INDEX holds_raffle_status ON sorteos.checkout_holds (raffle_id, status);
CREATE INDEX holds_expiry ON sorteos.checkout_holds (expires_at) WHERE status = 'ACTIVE';

CREATE TABLE sorteos.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE CHECK (order_code ~ '^RF-[A-Z0-9]{16,64}$'),
  raffle_id uuid NOT NULL REFERENCES sorteos.raffles(id),
  customer_id uuid NOT NULL REFERENCES sorteos.customers(id),
  session_id uuid NOT NULL REFERENCES sorteos.guest_sessions(id),
  hold_id uuid NOT NULL UNIQUE,
  ticket_quantity integer NOT NULL CHECK (ticket_quantity > 0),
  unit_price_minor sorteos.positive_minor NOT NULL,
  total_minor bigint GENERATED ALWAYS AS (ticket_quantity::bigint * unit_price_minor) STORED,
  currency text NOT NULL DEFAULT 'DOP' CHECK (currency = 'DOP'),
  status sorteos.order_status NOT NULL DEFAULT 'PENDING_REVIEW',
  rules_version_snapshot text NOT NULL,
  lookup_secret_hash sorteos.sha256 NOT NULL,
  idempotency_key uuid NOT NULL,
  request_hash sorteos.sha256 NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES sorteos.admin_users(id),
  cancel_reason text,
  resolution_type text CHECK (resolution_type IN ('NOT_PAID_CONFIRMED','REFUNDED','DUPLICATE_RESOLVED')),
  evidence_reference text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (hold_id, raffle_id) REFERENCES sorteos.checkout_holds(id, raffle_id),
  UNIQUE (id, raffle_id),
  UNIQUE (session_id, idempotency_key),
  CHECK (total_minor BETWEEN 1 AND 9007199254740991),
  CHECK (status <> 'CANCELLED' OR
    (length(btrim(cancel_reason)) > 0 AND cancel_reason IS NOT NULL AND resolution_type IS NOT NULL
     AND evidence_reference IS NOT NULL AND length(btrim(evidence_reference)) > 0
     AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)),
  CHECK (status <> 'PAID' OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL))
);
CREATE INDEX orders_raffle_status_created ON sorteos.orders (raffle_id, status, created_at);
CREATE INDEX orders_status_created ON sorteos.orders (status, created_at);
CREATE INDEX orders_customer ON sorteos.orders (customer_id);
CREATE INDEX orders_reviewer ON sorteos.orders (reviewed_by);

CREATE TABLE sorteos.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES sorteos.raffles(id),
  number integer NOT NULL CHECK (number >= 0),
  status sorteos.ticket_status NOT NULL DEFAULT 'AVAILABLE',
  hold_id uuid,
  current_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, number),
  UNIQUE (id, raffle_id),
  FOREIGN KEY (hold_id, raffle_id) REFERENCES sorteos.checkout_holds(id, raffle_id),
  FOREIGN KEY (current_order_id, raffle_id) REFERENCES sorteos.orders(id, raffle_id),
  CHECK (
    (status = 'AVAILABLE' AND hold_id IS NULL AND current_order_id IS NULL) OR
    (status = 'HELD' AND hold_id IS NOT NULL AND current_order_id IS NULL) OR
    (status IN ('RESERVED','SOLD') AND hold_id IS NULL AND current_order_id IS NOT NULL)
  )
);
CREATE INDEX tickets_raffle_status ON sorteos.tickets (raffle_id, status);
CREATE INDEX tickets_hold ON sorteos.tickets (hold_id) WHERE hold_id IS NOT NULL;
CREATE INDEX tickets_order ON sorteos.tickets (current_order_id) WHERE current_order_id IS NOT NULL;

CREATE TABLE sorteos.order_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  raffle_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  FOREIGN KEY (order_id, raffle_id) REFERENCES sorteos.orders(id, raffle_id),
  FOREIGN KEY (ticket_id, raffle_id) REFERENCES sorteos.tickets(id, raffle_id),
  UNIQUE (order_id, ticket_id),
  CHECK (released_at IS NULL OR released_at >= assigned_at)
);
CREATE UNIQUE INDEX one_active_order_per_ticket ON sorteos.order_tickets (ticket_id) WHERE released_at IS NULL;
CREATE INDEX order_tickets_ticket_history ON sorteos.order_tickets (ticket_id, assigned_at);
CREATE INDEX order_tickets_raffle ON sorteos.order_tickets (raffle_id);

CREATE TABLE sorteos.payment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sorteos.orders(id),
  bank_account_id uuid NOT NULL REFERENCES sorteos.bank_accounts(id),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 180),
  reported_at timestamptz NOT NULL DEFAULT now(),
  transfer_date timestamptz NOT NULL,
  receipt_storage_path text NOT NULL CHECK (
    receipt_storage_path ~ '^(pending|receipts)/[a-zA-Z0-9_./-]+$' AND receipt_storage_path !~ '\.\.'),
  receipt_sha256 sorteos.sha256 NOT NULL,
  status sorteos.payment_status NOT NULL DEFAULT 'REPORTED',
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  verified_amount_minor sorteos.positive_minor,
  bank_posted_at timestamptz,
  bank_confirmation_reference text,
  reviewer_id uuid REFERENCES sorteos.admin_users(id),
  reviewed_at timestamptz,
  resolution_note text,
  UNIQUE (order_id, revision),
  CHECK (status <> 'VERIFIED' OR (verified_amount_minor IS NOT NULL AND bank_posted_at IS NOT NULL
    AND reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL AND bank_confirmation_reference IS NOT NULL
    AND length(btrim(bank_confirmation_reference)) > 0))
);
CREATE UNIQUE INDEX one_active_report_per_order ON sorteos.payment_reports(order_id) WHERE active;
CREATE INDEX reports_bank ON sorteos.payment_reports(bank_account_id);
CREATE INDEX reports_reference ON sorteos.payment_reports(reference);
CREATE INDEX reports_receipt_hash ON sorteos.payment_reports(receipt_sha256);
CREATE INDEX reports_reviewer ON sorteos.payment_reports(reviewer_id);

CREATE TABLE sorteos.payment_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES sorteos.orders(id),
  hold_id uuid REFERENCES sorteos.checkout_holds(id),
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 100),
  reported_amount_minor sorteos.positive_minor,
  reference text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED')),
  resolution text,
  resolved_by uuid REFERENCES sorteos.admin_users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (order_id IS NOT NULL OR hold_id IS NOT NULL),
  CHECK (status <> 'RESOLVED' OR (resolution IS NOT NULL AND length(btrim(resolution)) > 0
    AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL))
);
CREATE INDEX incidents_order ON sorteos.payment_incidents(order_id);
CREATE INDEX incidents_hold ON sorteos.payment_incidents(hold_id);
CREATE INDEX incidents_reviewer ON sorteos.payment_incidents(resolved_by);
CREATE INDEX incidents_status ON sorteos.payment_incidents(status, created_at);

CREATE TABLE sorteos.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('SYSTEM','ADMIN','GUEST','SEED')),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  old_status text,
  new_status text,
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_created ON sorteos.audit_logs(entity, entity_id, created_at);
CREATE INDEX audit_actor_created ON sorteos.audit_logs(actor_id, created_at);
CREATE INDEX audit_request ON sorteos.audit_logs(request_id);

CREATE FUNCTION sorteos.audit_write() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  INSERT INTO sorteos.audit_logs(actor_kind, actor_id, action, entity, entity_id, old_status, new_status, request_id)
  VALUES (coalesce(nullif(current_setting('app.actor_kind', true), ''), 'SYSTEM'),
    nullif(current_setting('app.actor_id', true), '')::uuid,
    TG_OP, TG_TABLE_NAME, NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->>'status' ELSE NULL END,
    to_jsonb(NEW)->>'status',
    coalesce(nullif(current_setting('app.request_id', true), '')::uuid, gen_random_uuid()));
  RETURN NEW;
END $$;

CREATE FUNCTION sorteos.reject_delete() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Historial protegido: %', TG_TABLE_NAME USING ERRCODE = '23514';
END $$;

CREATE FUNCTION sorteos.guard_raffle() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'DRAWN' THEN
    RAISE EXCEPTION 'Sorteo no habilitado' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.total_tickets <> OLD.total_tickets THEN
      RAISE EXCEPTION 'Numeracion inmutable; crear otra rifa' USING ERRCODE = '23514';
    END IF;
    IF NEW.ticket_price_minor <> OLD.ticket_price_minor AND EXISTS
      (SELECT 1 FROM sorteos.checkout_holds WHERE raffle_id = OLD.id) THEN
      RAISE EXCEPTION 'Precio comprometido' USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER raffle_guard BEFORE INSERT OR UPDATE ON sorteos.raffles
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_raffle();

CREATE FUNCTION sorteos.populate_tickets() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  INSERT INTO sorteos.tickets(raffle_id, number)
  SELECT NEW.id, n FROM generate_series(0, NEW.total_tickets - 1) n;
  RETURN NEW;
END $$;
CREATE TRIGGER raffle_inventory AFTER INSERT ON sorteos.raffles
FOR EACH ROW EXECUTE FUNCTION sorteos.populate_tickets();

CREATE FUNCTION sorteos.guard_ticket() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE r sorteos.raffles;
BEGIN
  SELECT * INTO STRICT r FROM sorteos.raffles WHERE id = NEW.raffle_id FOR UPDATE;
  IF NEW.number >= r.total_tickets THEN
    RAISE EXCEPTION 'Numero fuera de rango' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.raffle_id, NEW.number) IS DISTINCT FROM (OLD.id, OLD.raffle_id, OLD.number) THEN
      RAISE EXCEPTION 'Identidad de boleto inmutable' USING ERRCODE = '23514';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
      (OLD.status = 'AVAILABLE' AND NEW.status = 'HELD') OR
      (OLD.status = 'HELD' AND NEW.status IN ('AVAILABLE','RESERVED')) OR
      (OLD.status = 'RESERVED' AND NEW.status IN ('AVAILABLE','SOLD'))
    ) THEN RAISE EXCEPTION 'Transicion de boleto invalida' USING ERRCODE = '23514'; END IF;
    IF OLD.status = 'HELD' AND NEW.status = 'AVAILABLE' AND NOT EXISTS
      (SELECT 1 FROM sorteos.checkout_holds WHERE id = OLD.hold_id AND status IN ('EXPIRED','CANCELLED')) THEN
      RAISE EXCEPTION 'Liberacion de hold no resuelto' USING ERRCODE = '23514';
    END IF;
    IF OLD.status = 'RESERVED' AND NEW.status = 'AVAILABLE' AND NOT EXISTS
      (SELECT 1 FROM sorteos.orders WHERE id = OLD.current_order_id AND status = 'CANCELLED') THEN
      RAISE EXCEPTION 'Orden sin conciliacion' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = OLD.status AND (NEW.hold_id, NEW.current_order_id) IS DISTINCT FROM
      (OLD.hold_id, OLD.current_order_id) THEN
      RAISE EXCEPTION 'Reasignacion no permitida' USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ticket_guard BEFORE INSERT OR UPDATE ON sorteos.tickets
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_ticket();

CREATE FUNCTION sorteos.guard_hold() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE r sorteos.raffles;
BEGIN
  SELECT * INTO STRICT r FROM sorteos.raffles WHERE id = NEW.raffle_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'ACTIVE' OR NEW.quantity NOT BETWEEN r.min_purchase AND r.max_purchase
      OR NEW.unit_price_minor_snapshot <> r.ticket_price_minor OR NEW.rules_version_snapshot <> r.rules_version THEN
      RAISE EXCEPTION 'Snapshot de hold invalido' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (NEW.id, NEW.raffle_id, NEW.session_id, NEW.quantity, NEW.unit_price_minor_snapshot,
      NEW.rules_version_snapshot, NEW.expires_at, NEW.idempotency_key, NEW.request_hash, NEW.created_at)
      IS DISTINCT FROM (OLD.id, OLD.raffle_id, OLD.session_id, OLD.quantity, OLD.unit_price_minor_snapshot,
      OLD.rules_version_snapshot, OLD.expires_at, OLD.idempotency_key, OLD.request_hash, OLD.created_at)
      OR (NEW.status <> OLD.status AND OLD.status <> 'ACTIVE') THEN
      RAISE EXCEPTION 'Hold inmutable o transicion invalida' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'EXPIRED' AND NEW.expires_at > now() THEN
      RAISE EXCEPTION 'Hold aun vigente' USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hold_guard BEFORE INSERT OR UPDATE ON sorteos.checkout_holds
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_hold();

CREATE FUNCTION sorteos.guard_order() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE h sorteos.checkout_holds;
BEGIN
  PERFORM 1 FROM sorteos.raffles WHERE id = NEW.raffle_id FOR UPDATE;
  SELECT * INTO STRICT h FROM sorteos.checkout_holds WHERE id = NEW.hold_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING_REVIEW' OR h.status <> 'ACTIVE' OR h.expires_at <= now()
      OR (NEW.raffle_id, NEW.session_id, NEW.ticket_quantity, NEW.unit_price_minor, NEW.rules_version_snapshot)
      IS DISTINCT FROM (h.raffle_id, h.session_id, h.quantity, h.unit_price_minor_snapshot, h.rules_version_snapshot) THEN
      RAISE EXCEPTION 'Orden sin hold vigente o snapshot invalido' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (NEW.id, NEW.order_code, NEW.raffle_id, NEW.customer_id, NEW.session_id, NEW.hold_id,
      NEW.ticket_quantity, NEW.unit_price_minor, NEW.currency, NEW.rules_version_snapshot,
      NEW.lookup_secret_hash, NEW.idempotency_key, NEW.request_hash, NEW.created_at)
      IS DISTINCT FROM (OLD.id, OLD.order_code, OLD.raffle_id, OLD.customer_id, OLD.session_id, OLD.hold_id,
      OLD.ticket_quantity, OLD.unit_price_minor, OLD.currency, OLD.rules_version_snapshot,
      OLD.lookup_secret_hash, OLD.idempotency_key, OLD.request_hash, OLD.created_at) THEN
      RAISE EXCEPTION 'Snapshot de orden inmutable' USING ERRCODE = '23514';
    END IF;
    IF NEW.status <> OLD.status AND NOT (
      (OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('UNDER_REVIEW','NEEDS_RESOLUTION','PAID','CANCELLED')) OR
      (OLD.status = 'UNDER_REVIEW' AND NEW.status IN ('NEEDS_RESOLUTION','PAID','CANCELLED')) OR
      (OLD.status = 'NEEDS_RESOLUTION' AND NEW.status IN ('UNDER_REVIEW','PAID','CANCELLED'))
    ) THEN RAISE EXCEPTION 'Transicion de orden invalida' USING ERRCODE = '23514'; END IF;
    NEW.version := OLD.version + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_guard BEFORE INSERT OR UPDATE ON sorteos.orders
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_order();

CREATE FUNCTION sorteos.guard_history_link() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'order_tickets' THEN
    IF (NEW.id, NEW.order_id, NEW.ticket_id, NEW.raffle_id, NEW.assigned_at)
      IS DISTINCT FROM (OLD.id, OLD.order_id, OLD.ticket_id, OLD.raffle_id, OLD.assigned_at)
      OR (OLD.released_at IS NOT NULL AND NEW.released_at IS DISTINCT FROM OLD.released_at) THEN
      RAISE EXCEPTION 'Relacion historica inmutable' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF (NEW.id, NEW.order_id, NEW.bank_account_id, NEW.reference, NEW.reported_at,
      NEW.transfer_date, NEW.receipt_storage_path, NEW.receipt_sha256, NEW.revision)
      IS DISTINCT FROM (OLD.id, OLD.order_id, OLD.bank_account_id, OLD.reference, OLD.reported_at,
      OLD.transfer_date, OLD.receipt_storage_path, OLD.receipt_sha256, OLD.revision)
      OR (NOT OLD.active AND NEW.active) THEN
      RAISE EXCEPTION 'Comprobante inmutable; crear revision auditada' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_history BEFORE UPDATE ON sorteos.payment_reports
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_history_link();
CREATE TRIGGER ticket_history BEFORE UPDATE ON sorteos.order_tickets
FOR EACH ROW EXECUTE FUNCTION sorteos.guard_history_link();

-- Restricciones diferidas: solo el estado final de la transacción es aceptable.
CREATE FUNCTION sorteos.validate_commit() RETURNS trigger LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE h sorteos.checkout_holds; o sorteos.orders; target_hold uuid; target_order uuid;
  expected sorteos.ticket_status; n bigint; active_n bigint;
BEGIN
  IF TG_TABLE_NAME = 'checkout_holds' THEN target_hold := NEW.id;
  ELSIF TG_TABLE_NAME = 'orders' THEN target_order := NEW.id; target_hold := NEW.hold_id;
  ELSIF TG_TABLE_NAME IN ('payment_reports','order_tickets') THEN target_order := NEW.order_id;
  ELSIF TG_TABLE_NAME = 'tickets' THEN
    target_hold := coalesce(NEW.hold_id, OLD.hold_id);
    target_order := coalesce(NEW.current_order_id, OLD.current_order_id);
  END IF;
  IF target_hold IS NOT NULL THEN
    SELECT * INTO h FROM sorteos.checkout_holds WHERE id = target_hold;
    SELECT count(*) INTO n FROM sorteos.tickets WHERE hold_id = h.id;
    IF (h.status = 'ACTIVE' AND n <> h.quantity) OR (h.status <> 'ACTIVE' AND n <> 0)
      OR (h.status = 'CONSUMED' AND NOT EXISTS (SELECT 1 FROM sorteos.orders WHERE hold_id = h.id))
      OR (h.status IN ('EXPIRED','CANCELLED') AND EXISTS (SELECT 1 FROM sorteos.orders WHERE hold_id = h.id)) THEN
      RAISE EXCEPTION 'Inventario de hold inconsistente' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF target_order IS NOT NULL THEN
    SELECT * INTO o FROM sorteos.orders WHERE id = target_order;
    IF NOT EXISTS (SELECT 1 FROM sorteos.payment_reports WHERE order_id = o.id AND active) THEN
      RAISE EXCEPTION 'Comprobante obligatorio' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM sorteos.checkout_holds WHERE id = o.hold_id AND status = 'CONSUMED') THEN
      RAISE EXCEPTION 'Orden requiere hold consumido' USING ERRCODE = '23514';
    END IF;
    SELECT count(*), count(*) FILTER (WHERE released_at IS NULL) INTO n, active_n
      FROM sorteos.order_tickets WHERE order_id = o.id;
    IF n <> o.ticket_quantity OR active_n <> (CASE WHEN o.status = 'CANCELLED' THEN 0 ELSE o.ticket_quantity END) THEN
      RAISE EXCEPTION 'Boletos de orden inconsistentes' USING ERRCODE = '23514';
    END IF;
    expected := CASE WHEN o.status = 'PAID' THEN 'SOLD'::sorteos.ticket_status ELSE 'RESERVED'::sorteos.ticket_status END;
    IF o.status = 'CANCELLED' THEN
      IF EXISTS (SELECT 1 FROM sorteos.tickets WHERE current_order_id = o.id) THEN
        RAISE EXCEPTION 'Cancelacion sin liberacion controlada' USING ERRCODE = '23514';
      END IF;
    ELSE
      SELECT count(*) INTO n FROM sorteos.tickets t JOIN sorteos.order_tickets ot ON ot.ticket_id = t.id
      WHERE ot.order_id = o.id AND ot.released_at IS NULL AND t.current_order_id = o.id AND t.status = expected;
      IF n <> o.ticket_quantity OR (SELECT count(*) FROM sorteos.tickets WHERE current_order_id = o.id) <> n THEN
        RAISE EXCEPTION 'Estado de inventario incompatible con orden' USING ERRCODE = '23514';
      END IF;
    END IF;
    IF o.status = 'PAID' AND NOT EXISTS (SELECT 1 FROM sorteos.payment_reports
      WHERE order_id = o.id AND active AND status = 'VERIFIED' AND verified_amount_minor = o.total_minor) THEN
      RAISE EXCEPTION 'Pago no verificado o importe distinto' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['checkout_holds','orders','payment_reports','order_tickets'] LOOP
    EXECUTE format('CREATE CONSTRAINT TRIGGER consistency AFTER INSERT OR UPDATE ON sorteos.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sorteos.validate_commit()', t);
  END LOOP;
  -- AVAILABLE insertions cannot reference orders/holds; avoid N deferred checks during generation.
  CREATE CONSTRAINT TRIGGER consistency AFTER UPDATE ON sorteos.tickets
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sorteos.validate_commit();
  FOREACH t IN ARRAY ARRAY['admin_users','guest_sessions','raffles','raffle_media','bank_accounts','customers',
    'checkout_holds','orders','tickets','order_tickets','payment_reports','payment_incidents'] LOOP
    EXECUTE format('CREATE TRIGGER audit AFTER INSERT OR UPDATE ON sorteos.%I FOR EACH ROW EXECUTE FUNCTION sorteos.audit_write()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['admin_users','guest_sessions','raffles','bank_accounts','customers','checkout_holds',
    'orders','tickets','order_tickets','payment_reports','payment_incidents','audit_logs'] LOOP
    EXECUTE format('CREATE TRIGGER preserve_history BEFORE DELETE OR TRUNCATE ON sorteos.%I FOR EACH STATEMENT EXECUTE FUNCTION sorteos.reject_delete()', t);
  END LOOP;
  CREATE TRIGGER audit_append_only BEFORE UPDATE ON sorteos.audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION sorteos.reject_delete();
  FOREACH t IN ARRAY ARRAY['admin_users','guest_sessions','raffles','raffle_media','bank_accounts','customers',
    'checkout_holds','orders','tickets','order_tickets','payment_reports','payment_incidents','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE sorteos.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON sorteos.%I FROM PUBLIC', t);
  END LOOP;
  -- No depender de que anon/authenticated existan en PostgreSQL aislado.
  FOREACH t IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = t) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA sorteos FROM %I', t);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA sorteos FROM %I', t);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sorteos FROM %I', t);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA sorteos FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA sorteos REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

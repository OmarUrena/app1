"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { formatDate, formatMoney } from "@/lib/format";
import { checkoutApi, type BankAccount, type Hold } from "./api";
import { intentStorageKey, readIntent, remainingSeconds, saveIntent, type Intent } from "./persistence";

type Props = { baseUrl: string; raffle: { id: string; slug: string; title: string; min: number; max: number; available: number; unitPriceMinor: number } };
export function CheckoutForm({ baseUrl, raffle }: Props) {
  const router = useRouter();
  const api = useMemo(() => checkoutApi(baseUrl), [baseUrl]);
  const [raw, setRaw] = useState(String(raffle.min));
  const [intent, setIntent] = useState<Intent | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [banks, setBanks] = useState<BankAccount[] | null>(null);
  const [bankError, setBankError] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const locked = useRef(false);
  const received = useRef(0);
  const value = Number(raw);
  const valid = raw.trim() !== "" && Number.isSafeInteger(value) && value >= raffle.min && value <= raffle.max;
  const active = hold?.status === "ACTIVE" && seconds > 0;
  const nearExpiry = active && seconds <= 300;
  const foreign = !!intent && intent.raffleId !== raffle.id;
  const canEditRejected = !!error && !hold && [400, 409, 422, 429].includes(error.status) && error.code !== "IDEMPOTENCY_CONFLICT" && !intent?.holdId && !intent?.uncertain;

  const accept = useCallback((result: Hold, elapsed = 0) => {
    if (result.raffleId !== raffle.id) throw new ApiError("IDEMPOTENCY_CONFLICT", 409);
    received.current = performance.now() - elapsed;
    setHold(result);
    setSeconds(remainingSeconds(result.expiresAt, result.serverTime, elapsed));
    setBanks(null); setBankError(false);
    setRaw(String(result.quantity));
  }, [raffle.id]);
  useEffect(() => {
    let current = true;
    void Promise.resolve().then(async () => {
      if (!current) return;
      try {
        const stored = readIntent(sessionStorage);
        setIntent(stored);
        if (stored?.raffleId === raffle.id) {
          setRaw(String(stored.quantity));
          if (stored.holdId) {
            const started = performance.now();
            setBusy(true);
            await api.get(stored.holdId).then(result => { if (current) accept(result, performance.now() - started); }).catch(error => { if (current) setError(error instanceof ApiError ? error : new ApiError("NETWORK_ERROR", 0)); }).finally(() => { if (current) { setBusy(false); setReady(true); } });
            return;
          }
        }
        setReady(true);
      } catch { setStorageFailed(true); setReady(true); }
    });
    return () => { current = false; };
  }, [api, raffle.id, accept]);

  useEffect(() => {
    if (hold?.status !== "ACTIVE") return;
    const update = () => setSeconds(remainingSeconds(hold.expiresAt, hold.serverTime, performance.now() - received.current));
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [hold]);

  useEffect(() => {
    if (!hold || hold.status !== "ACTIVE") return;
    let current = true;
    api.banks().then(items => { if (current) setBanks(items); }).catch(() => { if (current) setBankError(true); });
    return () => { current = false; };
  }, [api, hold]);

  async function run(action: () => Promise<void>) {
    if (locked.current || busy) return;
    locked.current = true; setBusy(true); setError(null);
    try { await action(); }
    catch (error) { setError(error instanceof ApiError ? error : new ApiError("NETWORK_ERROR", 0)); }
    finally { locked.current = false; setBusy(false); }
  }
  function refresh() {
    if (!hold) return;
    void run(async () => { const started = performance.now(); accept(await api.get(hold.holdId), performance.now() - started); });
  }

  function reserve() {
    if (foreign || !ready || storageFailed || (!intent && !valid)) return;
    void run(async () => {
      let request: Intent = intent ?? { key: crypto.randomUUID(), raffleId: raffle.id, slug: raffle.slug, quantity: value };
      if (request.holdId) {
        const started = performance.now();
        accept(await api.get(request.holdId), performance.now() - started);
        return;
      }
      // Persist BEFORE any write. A lost response must reuse this exact payload/key.
      try { saveIntent(sessionStorage, request); } catch { setStorageFailed(true); return; }
      setIntent(request);
      if (!request.sessionReady) {
        await api.session();
        request = { ...request, sessionReady: true };
        saveIntent(sessionStorage, request); setIntent(request);
      }
      const started = performance.now();
      const wasUncertain = !!request.uncertain;
      request = { ...request, uncertain: true };
      saveIntent(sessionStorage, request); setIntent(request);
      let result: Hold;
      try { result = await api.create(request.raffleId, request.quantity, request.key); }
      catch (error) {
        if (!wasUncertain && error instanceof ApiError && error.status >= 400 && error.status < 500) {
          request = { ...request, uncertain: false };
          saveIntent(sessionStorage, request); setIntent(request);
        }
        throw error;
      }
      accept(result, performance.now() - started);
      const stored = { ...request, holdId: result.holdId, uncertain: false };
      saveIntent(sessionStorage, stored); setIntent(stored);
    });
  }
  function release() {
    if (!hold || hold.status === "CONSUMED") return;
    void run(async () => {
      const result = await api.cancel(hold.holdId);
      accept(result);
      if (result.status === "CANCELLED" || result.status === "EXPIRED") {
        sessionStorage.removeItem(intentStorageKey); setIntent(null); setHold(null); setBanks(null); router.refresh();
      }
    });
  }
  function editRejected() {
    if (!canEditRejected) return;
    try { sessionStorage.removeItem(intentStorageKey); setIntent(null); setError(null); } catch { setStorageFailed(true); }
  }

  return <div className="checkout-grid" aria-busy={busy || !ready}>
    <section className="checkout-panel" aria-labelledby="quantity-title">
      <p className="eyebrow">01 · Cantidad</p><h2 id="quantity-title">Tu participación empieza aquí.</h2>
      <p>{raffle.title}</p><p>Precio publicado por boleto: <strong>{formatMoney(raffle.unitPriceMinor)}</strong>. El servidor confirmará el importe al pre-reservar.</p>
      <Alert title="Todavía no realices transferencias">La recepción de órdenes y comprobantes no está habilitada. Esta pre-reserva solo protege cupo temporal; no es una orden ni confirma un pago.</Alert>
      {!ready && <p role="status">Consultando tu cupo anterior…</p>}
      {storageFailed && <Alert title="No podemos guardar la recuperación" tone="error">Habilita el almacenamiento de esta pestaña. Si ya tenías un cupo o transferiste, solicita asistencia antes de intentar crear otro.</Alert>}
      {foreign ? <Alert title="Hay otra solicitud en esta pestaña"><Link href={`/rifas/${intent!.slug}/participar`}>Volver a la solicitud anterior</Link>. Revísala antes de crear otro cupo.</Alert> : <>
        <div className="quantity-field"><div className="quantity-row">
          <Button type="button" className="quantity-button" aria-label="Reducir cantidad" disabled={!ready || busy || !!intent || !valid || value <= raffle.min} onClick={() => setRaw(String(value - 1))}>−</Button>
          <Input id="checkout-quantity" type="number" inputMode="numeric" label="Cantidad de boletos" min={raffle.min} max={raffle.max} step={1} value={raw} disabled={!ready || busy || !!intent || storageFailed} onChange={event => setRaw(event.target.value)} error={!intent && !valid ? `Introduce una cantidad entera entre ${raffle.min} y ${raffle.max}.` : undefined} />
          <Button type="button" className="quantity-button" aria-label="Aumentar cantidad" disabled={!ready || busy || !!intent || !valid || value >= raffle.max} onClick={() => setRaw(String(value + 1))}>+</Button>
        </div><p className="field-hint">De {raffle.min} a {raffle.max} boletos. Nunca eliges los números. Cambiar cantidad libera el cupo anterior y requiere una nueva pre-reserva, sin garantía de disponibilidad.</p></div>
        {!hold && <Button disabled={!ready || busy || storageFailed || (!intent && (!valid || raffle.available < raffle.min))} onClick={reserve}>{busy ? "Consultando…" : intent ? "Recuperar la misma solicitud" : "Consultar y reservar cupo temporal"}</Button>}
        {!hold && !intent && raffle.available < raffle.min && <p>No hay cupo disponible para la compra mínima. <Link href={`/rifas/${raffle.slug}`}>Volver a consultar disponibilidad</Link>.</p>}
        {intent && !hold && <p>No se creará otra intención al reintentar. Conservamos la misma cantidad y clave para evitar duplicados.</p>}
        {hold && <p role="status">{hold.status === "CONSUMED" ? "Cupo ya utilizado." : active ? "Cupo reservado temporalmente." : hold.status === "CANCELLED" ? "Cupo cancelado." : "Reserva vencida."} <a href="#resumen-cupo" className="text-link">Ver resumen</a></p>}
      </>}
      {error && <Alert title="No pudimos completar la consulta" tone="error"><p>{error.code === "IDEMPOTENCY_CONFLICT" ? "La solicitud tiene otros datos asociados. Conserva este intento y solicita asistencia." : error.message}</p>{error.requestId && <p>Referencia: {error.requestId}</p>}{canEditRejected && <Button className="button-secondary" disabled={busy} onClick={editRejected}>Revisar cantidad</Button>}</Alert>}
      <Link href="/ayuda#incidencias" className="text-link">Si ya transferiste, revisa cómo solicitar asistencia</Link>
    </section>
    <section className="checkout-panel" id="resumen-cupo" tabIndex={-1} aria-labelledby="summary-title">
      <p className="eyebrow">02 · Cupo temporal</p><h2 id="summary-title">Resumen de tu pre-reserva.</h2>
      {!hold ? <p>La cantidad y el importe confirmado aparecerán tras una respuesta del servidor. No tienes números asignados.</p> : <>
        <Alert title={hold.status === "CONSUMED" ? "Cupo ya utilizado" : active ? "Cupo reservado temporalmente" : hold.status === "CANCELLED" ? "Cupo cancelado" : "Reserva vencida"}>{hold.status === "CONSUMED" ? "Consulta tu orden por un canal protegido; no crees otra pre-reserva." : active ? "No es una orden. El pago aún no está verificado y no hay números para mostrar." : "No transfieras ni intentes enviar un comprobante con este cupo. Si ya transferiste, solicita asistencia antes de crear otro."}</Alert>
        <dl className="checkout-summary"><div><dt>Cantidad</dt><dd>{hold.quantity}</dd></div><div><dt>Precio congelado por boleto</dt><dd>{formatMoney(hold.unitPriceMinor)}</dd></div><div><dt>Total confirmado por servidor</dt><dd>{formatMoney(hold.totalMinor)}</dd></div></dl>
        {active && <><div className={`reservation-timer ${nearExpiry ? "timer-warning" : ""}`} role="timer" aria-label="Tiempo restante de cupo temporal"><span>Tiempo restante</span><strong>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</strong></div><p>Vence: {formatDate(hold.expiresAt)} (Santo Domingo).</p></>}
        {nearExpiry && <Alert title="El cupo está por vencer" tone="error">No transfieras. Una transferencia puede tardar más que el tiempo restante.</Alert>}
        <div className="checkout-actions"><Button className="button-secondary" disabled={busy} onClick={refresh}>Actualizar estado</Button>{hold.status !== "CONSUMED" && <Button className="button-secondary" disabled={busy} onClick={release}>{active ? "Liberar cupo y cambiar cantidad" : "Volver a consultar cupo"}</Button>}</div>
        {active && !nearExpiry && <div className="bank-preview"><h3>Cuentas publicadas</h3><p>Información de consulta. <strong>No transfieras todavía.</strong> El formulario único para registrar orden y comprobante está pendiente de habilitación.</p>{bankError ? <p>No pudimos consultar las cuentas. Puedes actualizar el estado para volver a consultar; tu cupo conserva su vencimiento.</p> : banks === null ? <p role="status">Consultando cuentas publicadas…</p> : !banks.length ? <p>No hay cuentas bancarias publicadas. No realices transferencias.</p> : banks.map(bank => <dl className="bank-account" key={bank.id}><div><dt>Banco</dt><dd>{bank.bankName}</dd></div><div><dt>Tipo</dt><dd>{bank.accountType === "SAVINGS" ? "Ahorros" : bank.accountType === "CHECKING" ? "Corriente" : bank.accountType}</dd></div><div><dt>Cuenta publicada</dt><dd>{bank.accountDisplay}</dd></div><div><dt>Titular</dt><dd>{bank.holderName}</dd></div><div><dt>Moneda</dt><dd>{bank.currency}</dd></div></dl>)}</div>}
      </>}
    </section>
  </div>;
}

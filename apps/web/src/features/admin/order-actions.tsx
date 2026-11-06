"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { AdminClientError, adminFetch } from "./client";
import { localTransferTime, parseMinor, type ActionBody, type ActionName, type AdminOrder, type AdminSession, type FinancialResult } from "./types";

const labels: Record<ActionName, string> = { "start-review": "Marcar en revisión", approve: "Aprobar pago", "request-resolution": "Requiere resolución", cancel: "Resolver y cancelar" };
export function OrderActions({ order, role, onReload }: { order: AdminOrder; role: AdminSession["role"]; onReload: () => Promise<void> }) {
  const [action, setAction] = useState<ActionName | null>(null), [resolution, setResolution] = useState("NOT_PAID_CONFIRMED");
  const [prepared, setPrepared] = useState<{ body: ActionBody; key: string } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [conflict, setConflict] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), flight = useRef(false);
  useEffect(() => { if (action && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [action]);
  const terminal = ["PAID", "CANCELLED"].includes(order.status);
  function open(value: ActionName) { setAction(value); setPrepared(null); setError(""); setConflict(false); setResolution("NOT_PAID_CONFIRMED"); }
  function close() { if (busy || prepared) return; dialog.current?.close(); setAction(null); }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const values = new FormData(event.currentTarget);
    const field = (name: string) => String(values.get(name) ?? "").trim();
    try {
      let body: ActionBody = { expectedVersion: order.version };
      if (action === "approve") {
        if (!values.has("bankVerified")) throw new Error("Confirma la verificación del ingreso bancario.");
        const amount = parseMinor(field("verifiedAmount"));
        if (amount !== order.totalMinor) throw new Error("El importe verificado debe coincidir exactamente con " + formatMoney(order.totalMinor) + ".");
        body = { ...body, verifiedAmountMinor: amount, bankPostedAt: localTransferTime(field("bankPostedAt")), bankConfirmationReference: field("bankConfirmationReference"), note: field("note"), bankVerified: true, duplicateSignalsReviewed: values.has("duplicateSignalsReviewed") };
      }
      if (action === "request-resolution") body = { ...body, reason: field("reason"), reportStatus: field("reportStatus") as "INVALID" | "DISPUTED" };
      if (action === "cancel") {
        if (!values.has("reconciliationConfirmed")) throw new Error("Confirma que la conciliación está completa.");
        const base = { ...body, resolutionType: resolution as "NOT_PAID_CONFIRMED" | "REFUNDED" | "DUPLICATE_RESOLVED", reason: field("reason"), evidenceReference: field("evidenceReference"), reconciliationConfirmed: true };
        if (resolution === "REFUNDED") {
          const receivedAmountMinor = parseMinor(field("receivedAmount")), refundAmountMinor = parseMinor(field("refundAmount"));
          if (receivedAmountMinor !== refundAmountMinor) throw new Error("El reembolso debe cubrir todo el importe recibido.");
          body = { ...base, receivedAmountMinor, refundAmountMinor, refundReference: field("refundReference"), refundedAt: localTransferTime(field("refundedAt")) };
        } else if (resolution === "DUPLICATE_RESOLVED") body = { ...base, duplicateOfOrderId: field("duplicateOfOrderId"), duplicateBankReference: field("duplicateBankReference") };
        else body = base;
      }
      setPrepared({ body, key: crypto.randomUUID() });
    } catch (error) { setError(error instanceof Error ? error.message : "Revisa los campos."); }
  }
  async function confirm() {
    if (!action || !prepared || flight.current || conflict) return;
    flight.current = true; setBusy(true); setError("");
    try {
      await adminFetch<FinancialResult>(`/admin/api/orders/${order.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": prepared.key }, body: JSON.stringify(prepared.body) });
      dialog.current?.close(); setAction(null); setPrepared(null); await onReload();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo completar la decisión.");
      if (error instanceof AdminClientError && error.status === 409) setConflict(true);
      // On ambiguous failures retain the exact key/payload, even for manual retry.
      else if (error instanceof AdminClientError && error.status >= 400 && error.status < 500 && error.status !== 429) setPrepared(null);
    } finally { flight.current = false; setBusy(false); }
  }
  return <Card><h2>Decisión administrativa</h2>{terminal ? <p>Esta orden tiene una decisión final. No admite más acciones de revisión.</p> : <><p>La aprobación exige verificar el ingreso en el banco. Requerir resolución conserva todos los números reservados.</p>
    <div className="admin-toolbar">{["PENDING_REVIEW", "NEEDS_RESOLUTION"].includes(order.status) && <Button onClick={() => open("start-review")}>{labels["start-review"]}</Button>}<Button className="button-secondary" onClick={() => open("request-resolution")}>{labels["request-resolution"]}</Button>{role === "OWNER" && <><Button onClick={() => open("approve")}>{labels.approve}</Button><Button className="button-secondary" onClick={() => open("cancel")}>{labels.cancel}</Button></>}</div>{role !== "OWNER" && <p className="muted">Solo el propietario puede aprobar pagos o resolver cancelaciones.</p>}</>}
    <dialog ref={dialog} className="admin-dialog" aria-labelledby="decision-title" onCancel={event => { if (busy || prepared) event.preventDefault(); else setAction(null); }}>
      <h2 id="decision-title">{action && labels[action]}</h2><p className="order-code">{order.orderCode}</p><p>Total: {formatMoney(order.totalMinor)} · {order.quantity} boletos</p>
      {error && <Alert title="La decisión necesita atención" tone="error">{error}</Alert>}
      {action && <form method="post" onSubmit={prepare} className="admin-form"><fieldset disabled={busy || Boolean(prepared)}>
        {action === "approve" && <><Input id="verified-amount" label="Importe verificado en RD$" name="verifiedAmount" inputMode="decimal" required maxLength={17} />
          <Input id="bank-posted" label="Fecha y hora del ingreso (Santo Domingo)" name="bankPostedAt" type="datetime-local" required />
          <Input id="bank-confirmation" label="Referencia de confirmación bancaria" name="bankConfirmationReference" required maxLength={180} />
          <Input id="approval-note" label="Nota de verificación" name="note" required minLength={10} maxLength={2000} />
          <label className="admin-check"><input type="checkbox" name="bankVerified" required />Confirmo que verifiqué el ingreso en el banco, no solo el comprobante.</label>
          <label className="admin-check"><input type="checkbox" name="duplicateSignalsReviewed" required={order.duplicateReferenceCount > 0 || order.duplicateReceiptCount > 0} />Revisé las posibles referencias o comprobantes duplicados.</label></>}
        {action === "request-resolution" && <><label className="field">Estado del comprobante<select name="reportStatus"><option value="DISPUTED">Cuestionado: requiere aclaración</option><option value="INVALID">Inválido: requiere conciliación</option></select></label><Input id="resolution-reason" label="Motivo de resolución" name="reason" minLength={10} maxLength={2000} required /><p>Los boletos seguirán reservados sin expiración automática.</p></>}
        {action === "cancel" && <><label className="field">Resultado de conciliación<select name="resolutionType" value={resolution} onChange={event => setResolution(event.target.value)}><option value="NOT_PAID_CONFIRMED">Ausencia de ingreso confirmada</option><option value="REFUNDED">Ingreso devuelto por completo</option><option value="DUPLICATE_RESOLVED">Duplicado resuelto contra otra orden pagada</option></select></label>
          <Input id="cancel-reason" label="Motivo de cancelación" name="reason" minLength={10} maxLength={2000} required /><Input id="evidence-reference" label="Referencia de evidencia de conciliación" name="evidenceReference" maxLength={180} required />
          {resolution === "REFUNDED" && <><Input id="received-amount" label="Importe recibido en RD$" name="receivedAmount" inputMode="decimal" required /><Input id="refund-amount" label="Importe devuelto en RD$" name="refundAmount" inputMode="decimal" required /><Input id="refund-reference" label="Referencia del reembolso realizado" name="refundReference" required maxLength={180} /><Input id="refunded-at" label="Fecha y hora del reembolso (Santo Domingo)" name="refundedAt" type="datetime-local" required /><p>Este sistema registra una devolución ya realizada; no envía dinero.</p></>}
          {resolution === "DUPLICATE_RESOLVED" && <><Input id="duplicate-order" label="ID de la otra orden pagada" name="duplicateOfOrderId" pattern="[a-fA-F0-9-]{36}" maxLength={36} required /><Input id="duplicate-bank-ref" label="Referencia bancaria verificada de esa orden" name="duplicateBankReference" maxLength={180} required /></>}
          <label className="admin-check"><input type="checkbox" name="reconciliationConfirmed" required />Confirmo que documenté y completé la conciliación financiera.</label><p>Confirmar la cancelación liberará exactamente {order.quantity} boletos. Se conservará el historial.</p></>}
        {!prepared && <Button type="submit">Revisar decisión</Button>}
      </fieldset></form>}
      {prepared && <Alert title="Confirma la decisión"><p>{action && labels[action]} para esta orden. Los datos del intento quedan fijados hasta recibir una respuesta.</p><p>{action === "approve" ? "Los boletos pasarán a vendidos." : action === "cancel" ? "Los boletos se liberarán tras la conciliación documentada." : "Los boletos permanecerán reservados."}</p><Button disabled={busy || conflict} onClick={confirm}>{busy ? "Registrando decisión…" : error ? "Reintentar misma decisión" : "Confirmar decisión"}</Button>{!busy && !error && <Button className="button-secondary" onClick={() => setPrepared(null)}>Volver a editar</Button>}</Alert>}
      {conflict && <Button onClick={async () => { dialog.current?.close(); setAction(null); setPrepared(null); await onReload(); }}>Actualizar detalle antes de decidir</Button>}
      {!prepared && <Button className="button-secondary" disabled={busy} onClick={close}>Volver sin cambios</Button>}
    </dialog>
  </Card>;
}

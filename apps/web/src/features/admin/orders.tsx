"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Input } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { LogoutButton } from "./auth";
import { AdminClientError, adminFetch, navigateAdmin } from "./client";
import { OrderActions } from "./order-actions";
import { actionLabel, reportLabel, statusLabel, statuses, type AdminOrder, type AdminSession, type OrderPage } from "./types";

export function AdminFrame({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  useEffect(() => {
    const check = () => { void adminFetch("/admin/api/session").catch(error => { navigateAdmin(error instanceof AdminClientError && error.code === "MFA_REQUIRED" ? "/admin/mfa" : "/admin/login"); }); };
    const focus = () => { if (document.visibilityState === "visible") check(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) navigateAdmin("/admin"); };
    const interval = setInterval(check, 60000);
    const until = session.developmentAccessUntil ?? session.mfaVerifiedUntil;
    const deadline = until ? setTimeout(() => navigateAdmin("/admin/mfa"), Math.max(0, Date.parse(until) - Date.now())) : undefined;
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("pageshow", restored);
    return () => { clearInterval(interval); clearTimeout(deadline); document.removeEventListener("visibilitychange", focus); window.removeEventListener("pageshow", restored); };
  }, [session.mfaVerifiedUntil, session.developmentAccessUntil]);
  return <>{session.developmentAccessUntil && <Alert title="Prueba de desarrollo sin TOTP">Acceso temporal hasta {formatDate(session.developmentAccessUntil)}. Usa únicamente datos y comprobantes DEMO; no realices transferencias bancarias.</Alert>}<div className="admin-toolbar"><nav className="admin-toolbar" aria-label="Administración"><Link href="/admin" prefetch={false}>Resumen</Link><Link href="/admin/rifas" prefetch={false}>Rifas</Link><Link href="/admin/ordenes" prefetch={false}>Órdenes y revisión</Link><Link href="/admin/reportes" prefetch={false}>Reportes</Link></nav><span>Permiso: {session.role === "OWNER" ? "Propietario" : "Revisor"}</span><LogoutButton /></div>{children}</>;
}

export function OrdersList() {
  const hydrated = useHydrated();
  const [query, setQuery] = useState("page=1&pageSize=20"), [data, setData] = useState<OrderPage | null>(null);
  const [error, setError] = useState(""), [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    adminFetch<OrderPage>("/admin/api/orders?" + query).then(data => { if (active) setData(data); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [query, version]);
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget), params = new URLSearchParams({ page: "1", pageSize: "20" });
    for (const name of ["status", "raffleId", "from", "to"]) {
      const value = String(fields.get(name) ?? "").trim();
      if (value) params.set(name, name === "from" ? value + "T00:00:00-04:00" : name === "to" ? value + "T23:59:59.999-04:00" : value);
    }
    setData(null); setError(""); setQuery(params.toString()); setVersion(v => v + 1);
  }
  function page(offset: number) {
    const params = new URLSearchParams(query); params.set("page", String(Number(params.get("page")) + offset)); setData(null); setError(""); setQuery(params.toString());
  }
  return <><Card><h2>Filtrar órdenes</h2><form className="admin-filters" onSubmit={filter}>
    <div className="field"><label htmlFor="status-filter">Estado</label><select id="status-filter" name="status" defaultValue="" disabled={!hydrated}><option value="">Todos</option>{Object.entries(statuses).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
    <Input id="raffle-filter" label="ID de rifa (opcional)" name="raffleId" maxLength={36} pattern="[a-fA-F0-9-]{36}" disabled={!hydrated} />
    <Input id="from-filter" label="Creada desde" name="from" type="date" disabled={!hydrated} /><Input id="to-filter" label="Creada hasta" name="to" type="date" disabled={!hydrated} />
    <Button type="submit" disabled={!hydrated}>Aplicar filtros</Button></form><p className="muted">Fechas en America/Santo_Domingo. La lista no incluye datos personales.</p></Card>
    {error && <Alert title="No se pudo cargar la bandeja" tone="error">{error}<Button onClick={() => { setError(""); setVersion(v => v + 1); }}>Reintentar consulta</Button></Alert>}
    {!data && !error && <p role="status">Cargando órdenes…</p>}
    {data && <><p role="status">{data.pagination.total ?? 0} órdenes encontradas</p><div className="admin-order-list">{data.items.map(order => <Card key={order.id}>
      <div className="admin-toolbar"><Badge>{statusLabel(order.status)}</Badge><span>{formatDate(order.createdAt)}</span></div>
      <h2>{order.raffleTitle}</h2><p className="order-code">{order.orderCode}</p><p>{order.quantity} boletos · {formatMoney(order.totalMinor)}</p>
      {(order.duplicateReceiptCount > 0 || order.duplicateReferenceCount > 0) && <p className="admin-signal">Señales de posible duplicación: requieren revisión humana.</p>}
      <Link className="button button-secondary" href={`/admin/ordenes/${order.id}`} prefetch={false}>Revisar orden <span className="sr-only">{order.orderCode}</span></Link>
    </Card>)}</div>{data.items.length === 0 && <Card><h2>Sin órdenes para estos filtros</h2><p>Prueba otro estado o intervalo de fechas.</p></Card>}
      <nav className="pagination" aria-label="Páginas de órdenes"><Button disabled={(data.pagination.page ?? 1) <= 1} onClick={() => page(-1)}>Anterior</Button><span>Página {data.pagination.page}</span><Button disabled={(data.pagination.page ?? 1) * (data.pagination.pageSize ?? 20) >= (data.pagination.total ?? 0)} onClick={() => page(1)}>Siguiente</Button></nav></>}
  </>;
}

function PrivateReceipt({ reportId }: { reportId: string }) {
  const [file, setFile] = useState<{ url: string; type: string } | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  function clear() { if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null; setFile(null); }
  async function load() {
    setBusy(true); setError(""); clear();
    try {
      const response = await fetch(`/admin/api/payment-reports/${reportId}/receipt`, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const code = (await response.json().catch(() => null))?.error?.code ?? "STORAGE_UNAVAILABLE";
        if ([401, 403].includes(response.status)) navigateAdmin(code === "MFA_REQUIRED" ? "/admin/mfa" : "/admin/login");
        throw new AdminClientError(code, response.status);
      }
      const blob = await response.blob();
      if (!["image/jpeg", "image/png", "application/pdf"].includes(blob.type)) throw new Error("Formato de comprobante inesperado.");
      const url = URL.createObjectURL(blob); urlRef.current = url; setFile({ url, type: blob.type });
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo consultar el comprobante."); } finally { setBusy(false); }
  }
  return <Card><h2>Comprobante privado</h2><p>Recibir un archivo no demuestra que el dinero llegó al banco. Consulta el ingreso antes de aprobar.</p>
    {error && <Alert title="Archivo no disponible" tone="error">{error}</Alert>}
    <div className="admin-toolbar"><Button disabled={busy} onClick={load}>{busy ? "Consultando archivo…" : "Abrir comprobante"}</Button>{file && <Button className="button-secondary" onClick={clear}>Ocultar comprobante</Button>}</div>
    {file && <div className="admin-receipt">{file.type === "application/pdf" ? <iframe title="Vista privada del comprobante PDF" src={file.url} sandbox="" /> : <Image unoptimized width={800} height={600} src={file.url} alt="Comprobante bancario adjunto a esta orden" />}<a className="button button-secondary" href={file.url} download={`comprobante.${file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`}>Descargar copia privada</a><p className="muted">La copia descargada contiene información privada. Consérvala solo según la política del negocio.</p></div>}
  </Card>;
}

export function OrderDetail({ id, role }: { id: string; role: AdminSession["role"] }) {
  const [order, setOrder] = useState<AdminOrder | null>(null), [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(async () => {
    setOrder(null); setError(""); setRevision(value => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    adminFetch<AdminOrder>(`/admin/api/orders/${id}`).then(data => { if (active) setOrder(data); }).catch(error => { if (active) setError(error instanceof Error ? error.message : "No se pudo consultar la orden."); });
    return () => { active = false; };
  }, [id, revision]);
  if (error) return <Alert title="No se pudo cargar la orden" tone="error">{error}<Button onClick={reload}>Actualizar detalle</Button></Alert>;
  if (!order) return <p role="status">Cargando detalle protegido…</p>;
  return <><div className="admin-toolbar"><Badge>{statusLabel(order.status)}</Badge><Button className="button-secondary" onClick={reload}>Actualizar detalle</Button></div>
    <div className="admin-detail-grid"><Card><h2>{order.raffleTitle}</h2><p className="order-code">{order.orderCode}</p><dl className="checkout-summary">
      <div><dt>Creada</dt><dd>{formatDate(order.createdAt)}</dd></div><div><dt>Cantidad</dt><dd>{order.quantity}</dd></div><div><dt>Total de la orden</dt><dd>{formatMoney(order.totalMinor)}</dd></div>
      <div><dt>Comprador</dt><dd>{order.customer.name}</dd></div><div><dt>Teléfono</dt><dd>{order.customer.phone}</dd></div><div><dt>Correo</dt><dd>{order.customer.email ?? "No registrado en orden histórica"}</dd></div>
      <div><dt>Referencia reportada</dt><dd>{order.paymentReport.reference}</dd></div><div><dt>Transferencia reportada</dt><dd>{formatDate(order.paymentReport.transferDate)}</dd></div><div><dt>Reporte de pago</dt><dd>{reportLabel(order.paymentReport.status)}</dd></div>
      {order.paymentReport.verifiedAmountMinor !== null && <div><dt>Importe verificado</dt><dd>{formatMoney(order.paymentReport.verifiedAmountMinor)}</dd></div>}
      {order.paymentReport.bankConfirmationReference && <div><dt>Confirmación bancaria</dt><dd>{order.paymentReport.bankConfirmationReference}</dd></div>}
    </dl><h3>Números de la orden</h3><ul className="ticket-numbers" aria-label="Números de la orden">{order.ticketNumbers.map(n => <li key={n}>{n}</li>)}</ul><p>{order.status === "PAID" ? "Boletos vendidos tras verificación bancaria." : order.status === "CANCELLED" ? "La asignación se conserva como historial. Los boletos fueron liberados tras conciliación." : "Los números permanecen reservados sin vencimiento automático."}</p></Card>
      <PrivateReceipt key={order.version} reportId={order.paymentReport.id} /></div>
    {(order.duplicateReceiptCount > 0 || order.duplicateReferenceCount > 0) && <Alert title="Revisar posibles duplicados">Referencia repetida: {order.duplicateReferenceCount}. Archivo repetido: {order.duplicateReceiptCount}. Estas señales no determinan fraude ni confirman un pago.</Alert>}
    <OrderActions order={order} role={role} onReload={reload} />
    <div className="admin-detail-grid"><Card><h2>Historial de revisión</h2>{order.actions.length === 0 ? <p>Aún no hay decisiones administrativas.</p> : <ol className="admin-history">{order.actions.map(action => <li key={action.id}><strong>{actionLabel(action.action)}</strong><p>{formatDate(action.createdAt)} · {statusLabel(action.result.status)}</p><p className="order-code">Administrador: {action.adminId}</p>{typeof action.payload.reason === "string" && <p>{action.payload.reason}</p>}{typeof action.payload.note === "string" && <p>{action.payload.note}</p>}</li>)}</ol>}<p className="muted">Se muestran hasta las últimas 100 decisiones; el histórico se conserva.</p></Card>
      <Card><h2>Incidencias de conciliación</h2>{order.incidents.length === 0 ? <p>Sin incidencias registradas.</p> : <ul>{order.incidents.map(incident => <li key={incident.id}><strong>{incident.category}</strong> · {incident.status}{incident.resolution && <p>{incident.resolution}</p>}</li>)}</ul>}</Card></div>
  </>;
}

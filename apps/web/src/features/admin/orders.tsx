"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Card, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatMoney } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { AdminStatus } from "./frame";
import { RaffleSelect } from "./raffle-select";
import { AdminClientError, adminFetch, navigateAdmin } from "./client";
import { OrderActions } from "./order-actions";
import { actionLabel, reportLabel, statusLabel, statuses, type AdminOrder, type AdminSession, type OrderPage } from "./types";
const orderDate = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export { AdminFrame } from "./frame";

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
  return <><Card className="admin-filter-panel"><h2>Filtrar órdenes</h2><form className="admin-filters" onSubmit={filter}>
    <div className="field"><label htmlFor="status-filter">Estado</label><select id="status-filter" name="status" defaultValue="" disabled={!hydrated}><option value="">Todos</option>{Object.entries(statuses).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
    <RaffleSelect id="raffle-filter" disabled={!hydrated} />
    <Input id="from-filter" label="Creada desde" name="from" type="date" disabled={!hydrated} /><Input id="to-filter" label="Creada hasta" name="to" type="date" disabled={!hydrated} />
    <Button type="submit" disabled={!hydrated}>Aplicar filtros</Button></form><p className="admin-filter-note">Fechas en hora dominicana. Abre una orden para consultar sus datos y revisar el comprobante.</p></Card>
    {error && <Alert title="No se pudo cargar la bandeja" tone="error">{error}<Button onClick={() => { setError(""); setVersion(v => v + 1); }}>Reintentar consulta</Button></Alert>}
    {!data && !error && <p role="status">Cargando órdenes…</p>}
    {data && <section className="admin-table-panel" aria-label="Bandeja de órdenes"><div className="admin-table-heading"><h2>Órdenes registradas</h2><span className="admin-table-count" role="status">{data.pagination.total ?? 0} órdenes encontradas</span></div><div className="admin-table-scroll" role="region" aria-label="Tabla de órdenes" tabIndex={0}><table className="admin-data-table"><thead><tr><th scope="col">Orden / fecha</th><th scope="col">Rifa</th><th scope="col" className="numeric">Boletos</th><th scope="col" className="numeric">Importe</th><th scope="col">Estado</th><th scope="col">Revisión</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data.items.map(order => <tr key={order.id}>
      <th scope="row"><span className="table-code" title={order.orderCode}>{order.orderCode}</span><small>{orderDate.format(new Date(order.createdAt))}</small></th><td><span className="admin-table-raffle" title={order.raffleTitle}>{order.raffleTitle}</span></td><td className="numeric">{order.quantity}</td><td className="numeric"><strong>{formatMoney(order.totalMinor)}</strong></td><td><AdminStatus status={order.status}>{statusLabel(order.status)}</AdminStatus></td><td>{order.duplicateReceiptCount > 0 || order.duplicateReferenceCount > 0 ? <span className="admin-row-signal"><Icon name="shield" />Posible duplicado</span> : <span className="muted">Sin alertas de duplicación</span>}</td>
      <td><Link className="admin-table-action" href={`/admin/ordenes/${order.id}`} aria-label={`Revisar orden ${order.orderCode}`} prefetch={false}>Revisar orden<Icon name="arrow" /></Link></td>
    </tr>)}{data.items.length === 0 && <tr><td colSpan={7}><div className="admin-empty"><h2>Sin órdenes para estos filtros</h2><p>Prueba otro estado o intervalo de fechas.</p></div></td></tr>}</tbody></table></div>
      <nav className="admin-pagination" aria-label="Páginas de órdenes"><span>{data.items.length ? `Mostrando ${((data.pagination.page ?? 1) - 1) * (data.pagination.pageSize ?? 20) + 1}–${Math.min((data.pagination.page ?? 1) * (data.pagination.pageSize ?? 20), data.pagination.total ?? 0)} de ${data.pagination.total ?? 0}` : "No hay resultados"}</span><div><Button className="button-secondary" disabled={(data.pagination.page ?? 1) <= 1} onClick={() => page(-1)}>Anterior</Button><span>Página {data.pagination.page}</span><Button className="button-secondary" disabled={(data.pagination.page ?? 1) * (data.pagination.pageSize ?? 20) >= (data.pagination.total ?? 0)} onClick={() => page(1)}>Siguiente</Button></div></nav></section>}
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
  return <><div className="admin-record-toolbar"><Link href="/admin/ordenes" prefetch={false}>← Volver a órdenes</Link><Button className="button-secondary" onClick={reload}>Actualizar detalle</Button></div><div className="admin-order-overview"><div><p className="eyebrow">Orden registrada</p><h2>{order.orderCode}</h2><p>{order.raffleTitle}</p></div><div className="admin-order-overview-total"><AdminStatus status={order.status}>{statusLabel(order.status)}</AdminStatus><strong>{formatMoney(order.totalMinor)}</strong></div></div>
    <div className="admin-detail-grid"><Card><h2>Información de la orden</h2><dl className="checkout-summary">
      <div><dt>Creada</dt><dd>{formatDate(order.createdAt)}</dd></div><div><dt>Cantidad</dt><dd>{order.quantity}</dd></div><div><dt>Total de la orden</dt><dd>{formatMoney(order.totalMinor)}</dd></div>
      </dl><h3>Datos del comprador</h3><dl className="checkout-summary"><div><dt>Comprador</dt><dd>{order.customer.name}</dd></div><div><dt>Teléfono</dt><dd>{order.customer.phone}</dd></div><div><dt>Correo</dt><dd>{order.customer.email ?? "No registrado en orden histórica"}</dd></div>
      </dl><h3>Transferencia reportada</h3><dl className="checkout-summary"><div><dt>Referencia reportada</dt><dd>{order.paymentReport.reference}</dd></div><div><dt>Transferencia reportada</dt><dd>{formatDate(order.paymentReport.transferDate)}</dd></div><div><dt>Reporte de pago</dt><dd>{reportLabel(order.paymentReport.status)}</dd></div>
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

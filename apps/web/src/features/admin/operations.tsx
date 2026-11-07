"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { components } from "@sorteos/api-client";
import { Alert, Button, ButtonLink, Card, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatMoney } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { adminFetch, AdminClientError, adminMessage } from "./client";
import { AdminStatus } from "./frame";
import { RaffleSelect } from "./raffle-select";
type Summary = components["schemas"]["OperationSummaryDto"];
export type AdminRaffle = components["schemas"]["AdminRaffleDto"];
export const raffleStates: Record<AdminRaffle["status"], string> = { DRAFT: "Borrador", PUBLISHED: "Publicada", PAUSED: "Pausada", CLOSED: "Cerrada", DRAWN: "Sorteada" };
export function aggregateMoney(value: string) {
  const minor = BigInt(value), integer = minor / 100n, cents = String(minor % 100n).padStart(2, "0");
  return "RD$ " + new Intl.NumberFormat("es-DO").format(integer) + "." + cents;
}
export function OperationalSummary({ id }: { id?: string }) {
  const [data, setData] = useState<Summary | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    adminFetch<Summary>(id ? `/admin/api/raffles/${id}/summary` : "/admin/api/dashboard").then(result => { if (active) setData(result); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [id, revision]);
  const reload = () => { setError(""); setData(null); setRevision(v => v + 1); };
  return <section aria-label="Indicadores operativos"><div className="admin-section-heading"><h2>Resumen operativo</h2><Button className="button-secondary" onClick={reload}><Icon name="clock" />Actualizar cifras</Button></div>
    {error ? <Alert title="No se pudieron consultar las cifras" tone="error">{error}</Alert> : !data ? <p role="status">Consultando cifras…</p> : <>
      <div className="admin-metrics"><Card><span className="admin-metric-icon"><Icon name="check" /></span><p>Ingresos confirmados</p><strong>{aggregateMoney(data.confirmedAmountMinor)}</strong><p>Pagos verificados manualmente.</p></Card><Card className="admin-metric-pending"><span className="admin-metric-icon"><Icon name="clock" /></span><p>Importe pendiente</p><strong>{aggregateMoney(data.pendingAmountMinor)}</strong><p>{data.pendingOrders} órdenes por resolver. No es ingreso recibido.</p></Card><Card><span className="admin-metric-icon"><Icon name="ticket" /></span><p>Rifas publicadas</p><strong>{data.activeRaffles}</strong><p>Publicaciones activas en el catálogo.</p></Card><Card><span className="admin-metric-icon"><Icon name="dashboard" /></span><p>Ocupación del inventario</p><strong>{data.total ? ((data.held + data.reserved + data.sold) * 100 / data.total).toFixed(1) : "0"}%</strong><p>Vendidos, reservados y cupos vigentes.</p></Card></div>
      <Card><h2>Distribución del inventario</h2><p className="admin-filter-note">Disponibilidad de {id ? "esta rifa" : "todas las rifas"} en el momento de la consulta.</p><dl className="admin-inventory">{([["Disponibles", data.available], ["Pre-reservados", data.held], ["Reservados en órdenes", data.reserved], ["Vendidos", data.sold], ["Total de números", data.total]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="admin-stock-bar" aria-hidden="true"><span className="admin-stock-sold" style={{ width: `${data.total ? data.sold * 100 / data.total : 0}%` }} /><span className="admin-stock-reserved" style={{ width: `${data.total ? data.reserved * 100 / data.total : 0}%` }} /><span className="admin-stock-held" style={{ width: `${data.total ? data.held * 100 / data.total : 0}%` }} /></div><p className="admin-data-note">Instantánea: {formatDate(data.asOf)}. Las pre-reservas vencidas cuentan como disponibles.</p></Card>
      {(data.pendingOrders > 0 || data.openIncidents > 0) && <Alert title="Conciliación pendiente">Hay {data.pendingOrders} órdenes pendientes y {data.openIncidents} incidencias abiertas. El cierre conserva sus reservas. No se puede realizar un sorteo con pagos sin resolver.</Alert>}
      {!id && <div className="admin-overview-links"><ButtonLink className="button-secondary" href="/admin/rifas" prefetch={false}>Administrar rifas<Icon name="arrow" /></ButtonLink><ButtonLink className="button-secondary" href="/admin/reportes" prefetch={false}>Generar un reporte<Icon name="report" /></ButtonLink></div>}
    </>}
  </section>;
}
export function RafflesList() {
  const [query, setQuery] = useState("page=1&pageSize=12"), [data, setData] = useState<components["schemas"]["AdminRafflePageDto"] | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; adminFetch<components["schemas"]["AdminRafflePageDto"]>("/admin/api/raffles?" + query).then(data => { if (active) setData(data); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, [query, revision]);
  function change(status: string, page = 1) { setData(null); setError(""); setQuery(new URLSearchParams({ page: String(page), pageSize: "12", ...(status ? { status } : {}) }).toString()); setRevision(v => v + 1); }
  return <><Card className="admin-filter-panel"><div className="field"><label htmlFor="raffle-status">Estado de rifa</label><select id="raffle-status" onChange={event => change(event.target.value)}><option value="">Todos los estados</option>{Object.entries(raffleStates).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div></Card>
    {error ? <Alert title="No se pudieron cargar las rifas" tone="error">{error}<Button onClick={() => change(new URLSearchParams(query).get("status") ?? "")}>Reintentar</Button></Alert> : !data ? <p role="status">Cargando rifas…</p> : <section className="admin-table-panel" aria-label="Listado de rifas"><div className="admin-table-heading"><h2>Rifas registradas</h2><span className="admin-table-count">{data.pagination.total} rifas</span></div><div className="admin-table-scroll" role="region" aria-label="Tabla de rifas" tabIndex={0}><table className="admin-data-table"><thead><tr><th scope="col">Rifa</th><th scope="col">Estado</th><th scope="col" className="numeric">Precio / número</th><th scope="col" className="numeric">Disponibles</th><th scope="col" className="numeric">Reservados</th><th scope="col" className="numeric">Vendidos</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data.items.map(raffle => <tr key={raffle.id}><th scope="row"><Link href={`/admin/rifas/${raffle.id}`} prefetch={false}>{raffle.title}</Link><small>/rifas/{raffle.slug}</small></th><td><AdminStatus status={raffle.status}>{raffleStates[raffle.status]}</AdminStatus></td><td className="numeric">{formatMoney(raffle.ticketPriceMinor)}</td><td className="numeric">{raffle.availableCount}<small>de {raffle.totalTickets}</small></td><td className="numeric">{raffle.reservedCount}</td><td className="numeric">{raffle.confirmedSoldCount}</td><td><Link className="admin-table-action" href={`/admin/rifas/${raffle.id}`} prefetch={false}>Administrar<span className="sr-only"> {raffle.title}</span><Icon name="arrow" /></Link></td></tr>)}{data.items.length === 0 && <tr><td colSpan={7}><div className="admin-empty"><h2>No hay rifas con este filtro</h2><p>Crea un borrador para configurar la próxima rifa.</p></div></td></tr>}</tbody></table></div>
      <nav className="admin-pagination" aria-label="Paginación de rifas"><span>Página {data.pagination.page} · {data.pagination.total} rifas</span><div><Button className="button-secondary" disabled={data.pagination.page <= 1} onClick={() => change(new URLSearchParams(query).get("status") ?? "", data.pagination.page - 1)}>Anterior</Button><Button className="button-secondary" disabled={data.pagination.page * data.pagination.pageSize >= data.pagination.total} onClick={() => change(new URLSearchParams(query).get("status") ?? "", data.pagination.page + 1)}>Siguiente</Button></div></nav></section>}
  </>;
}
export function OrdersExport({ owner }: { owner: boolean }) {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [done, setDone] = useState(false);
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setDone(false);
    const form = new FormData(event.currentTarget), query = new URLSearchParams();
    for (const key of ["raffleId", "status", "from", "to"]) { const value = String(form.get(key) ?? ""); if (value) query.set(key, key === "from" ? value + "T00:00:00-04:00" : key === "to" ? value + "T23:59:59.999-04:00" : value); }
    try {
      const response = await fetch("/admin/api/reports/orders.csv?" + query, { cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(20000) });
      if (!response.ok) { const body = await response.json(); throw new AdminClientError(body?.error?.code ?? "SERVICE_UNAVAILABLE", response.status); }
      if (!response.headers.get("content-type")?.startsWith("text/csv")) throw new Error(adminMessage("SERVICE_UNAVAILABLE"));
      const url = URL.createObjectURL(await response.blob()), link = document.createElement("a"); link.href = url; link.download = "ordenes.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo descargar el reporte."); } finally { setBusy(false); }
  }
  if (!owner) return <Alert title="Exportación restringida">Solo el propietario puede descargar reportes.</Alert>;
  return <div className="admin-export-layout"><Card><h2>Exportar órdenes</h2><p>Selecciona los criterios para generar un archivo CSV de hasta 10 000 órdenes. Las fechas corresponden a la hora dominicana.</p>
    <form className="admin-filters" onSubmit={download}><RaffleSelect id="export-raffle" disabled={!hydrated || busy} /><div className="field"><label htmlFor="export-status">Estado de orden</label><select id="export-status" name="status" disabled={busy}><option value="">Todos los estados</option><option value="PAID">Pagadas</option><option value="PENDING_REVIEW">Pendientes de revisión</option><option value="UNDER_REVIEW">En revisión</option><option value="NEEDS_RESOLUTION">Requieren resolución</option><option value="CANCELLED">Canceladas</option></select></div><Input id="export-from" label="Desde" name="from" type="date" disabled={busy} /><Input id="export-to" label="Hasta" name="to" type="date" disabled={busy} /><Button disabled={!hydrated || busy}><Icon name="report" />{busy ? "Generando reporte…" : "Descargar CSV"}</Button></form>
    {error && <Alert title="No se pudo exportar" tone="error">{error}</Alert>}{done && <p role="status">Reporte descargado. La operación quedó auditada.</p>}
  </Card><Card className="admin-export-note"><h2>Contenido del archivo</h2><ul><li>Código de orden y rifa.</li><li>Estado y cantidad de boletos.</li><li>Total en centavos DOP.</li><li>Fecha de creación en UTC.</li></ul><h3>Uso responsable</h3><p>La descarga queda auditada. No incluye nombres, teléfonos, correos, referencias bancarias ni comprobantes.</p><p>Conserva el archivo en un lugar privado y elimínalo al terminar su finalidad.</p></Card></div>;
}

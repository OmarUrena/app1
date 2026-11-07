"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { components } from "@sorteos/api-client";
import { Alert, Badge, Button, ButtonLink, Card, Input } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { adminFetch, AdminClientError, adminMessage } from "./client";
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
  return <section aria-label="Indicadores operativos"><div className="admin-toolbar"><h2>Resumen operativo</h2><Button className="button-secondary" onClick={reload}>Actualizar cifras</Button></div>
    {error ? <Alert title="No se pudieron consultar las cifras" tone="error">{error}</Alert> : !data ? <p role="status">Consultando cifras…</p> : <>
      <div className="admin-metrics"><Card><p>Ingresos confirmados</p><strong>{aggregateMoney(data.confirmedAmountMinor)}</strong><p className="muted">Solo órdenes con pago verificado.</p></Card><Card><p>Importe pendiente</p><strong>{aggregateMoney(data.pendingAmountMinor)}</strong><p>{data.pendingOrders} órdenes por resolver. No es ingreso recibido.</p></Card><Card><p>Ocupación</p><strong>{data.total ? ((data.held + data.reserved + data.sold) * 100 / data.total).toFixed(1) : "0"}%</strong><p>{data.activeRaffles} rifas publicadas</p></Card></div>
      <Card><dl className="admin-inventory">{([["Disponibles", data.available], ["Pre-reservados", data.held], ["Reservados en órdenes", data.reserved], ["Vendidos", data.sold], ["Total de números", data.total]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="muted">Instantánea: {formatDate(data.asOf)}. Las pre-reservas vencidas cuentan como disponibles.</p></Card>
      {(data.pendingOrders > 0 || data.openIncidents > 0) && <Alert title="Conciliación pendiente">Hay {data.pendingOrders} órdenes pendientes y {data.openIncidents} incidencias abiertas. El cierre conserva sus reservas. No se puede realizar un sorteo con pagos sin resolver.</Alert>}
    </>}
  </section>;
}
export function RafflesList() {
  const [query, setQuery] = useState("page=1&pageSize=12"), [data, setData] = useState<components["schemas"]["AdminRafflePageDto"] | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; adminFetch<components["schemas"]["AdminRafflePageDto"]>("/admin/api/raffles?" + query).then(data => { if (active) setData(data); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, [query, revision]);
  function change(status: string, page = 1) { setData(null); setError(""); setQuery(new URLSearchParams({ page: String(page), pageSize: "12", ...(status ? { status } : {}) }).toString()); setRevision(v => v + 1); }
  return <><div className="admin-toolbar"><ButtonLink href="/admin/rifas/nueva" prefetch={false}>Crear rifa</ButtonLink><div className="field"><label htmlFor="raffle-status">Estado de rifa</label><select id="raffle-status" onChange={event => change(event.target.value)}><option value="">Todos</option>{Object.entries(raffleStates).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></div></div>
    {error ? <Alert title="No se pudieron cargar las rifas" tone="error">{error}<Button onClick={() => change(new URLSearchParams(query).get("status") ?? "")}>Reintentar</Button></Alert> : !data ? <p role="status">Cargando rifas…</p> : <>{data.items.length === 0 ? <Card><h2>No hay rifas con este filtro</h2><p>Crea un borrador para configurar la próxima rifa.</p></Card> : <div className="admin-order-list">{data.items.map(raffle => <Card key={raffle.id}><Badge>{raffleStates[raffle.status]}</Badge><h2><Link prefetch={false} href={`/admin/rifas/${raffle.id}`}>{raffle.title}</Link></h2><p>{formatMoney(raffle.ticketPriceMinor)} por número · {raffle.totalTickets} números</p><p>{raffle.availableCount} disponibles · {raffle.reservedCount} reservados · {raffle.confirmedSoldCount} vendidos</p><Link href={`/admin/rifas/${raffle.id}`} prefetch={false}>Administrar rifa</Link></Card>)}</div>}
      <div className="admin-toolbar" aria-label="Paginación de rifas"><Button disabled={data.pagination.page <= 1} onClick={() => change(new URLSearchParams(query).get("status") ?? "", data.pagination.page - 1)}>Anterior</Button><span>Página {data.pagination.page} · {data.pagination.total} rifas</span><Button disabled={data.pagination.page * data.pagination.pageSize >= data.pagination.total} onClick={() => change(new URLSearchParams(query).get("status") ?? "", data.pagination.page + 1)}>Siguiente</Button></div></>}
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
  return <Card><h2>Exportar órdenes</h2><p>Descarga auditada, hasta 10 000 filas. Incluye código, rifa, estado, cantidad, total en centavos DOP y fecha UTC. No incluye datos del comprador ni referencias bancarias. El código por sí solo no permite consultar la compra.</p><p>Guarda el archivo en un lugar privado y elimínalo al terminar su finalidad.</p>
    <form className="admin-filters" onSubmit={download}><Input id="export-raffle" label="ID de rifa" name="raffleId" maxLength={36} /><Input id="export-from" label="Desde" name="from" type="date" /><Input id="export-to" label="Hasta" name="to" type="date" /><div className="field"><label htmlFor="export-status">Estado de orden</label><select id="export-status" name="status"><option value="">Todos</option><option value="PAID">Pagadas</option><option value="PENDING_REVIEW">Pendientes de revisión</option><option value="UNDER_REVIEW">En revisión</option><option value="NEEDS_RESOLUTION">Requieren resolución</option><option value="CANCELLED">Canceladas</option></select></div><Button disabled={!hydrated || busy}>{busy ? "Generando reporte…" : "Descargar CSV"}</Button></form>
    {error && <Alert title="No se pudo exportar" tone="error">{error}</Alert>}{done && <p role="status">Reporte descargado. La operación quedó auditada.</p>}
  </Card>;
}

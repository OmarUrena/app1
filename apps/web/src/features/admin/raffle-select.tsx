"use client";
import { useEffect, useState } from "react";
import type { components } from "@sorteos/api-client";
import { adminFetch } from "./client";
type Page = components["schemas"]["AdminRafflePageDto"];
export function RaffleSelect({ id, name = "raffleId", label = "Rifa", disabled = false }: { id: string; name?: string; label?: string; disabled?: boolean }) {
  const [items, setItems] = useState<Page["items"]>([]), [page, setPage] = useState(1), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    adminFetch<Page>(`/admin/api/raffles?page=${page}&pageSize=25`).then(result => { if (active) { setItems(previous => [...previous, ...result.items.filter(item => !previous.some(old => old.id === item.id))]); setTotal(result.pagination.total); } }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision]);
  return <div className="field"><label htmlFor={id}>{label}</label><select id={id} name={name} defaultValue="" disabled={disabled || (loading && !items.length)} aria-describedby={error || loading || items.length < total ? `${id}-status` : undefined}><option value="">{loading && !items.length ? "Cargando rifas…" : "Todas las rifas"}</option>{items.map(raffle => <option key={raffle.id} value={raffle.id}>{raffle.title}</option>)}</select>
    {(error || loading || items.length < total) && <div className="admin-raffle-select-tools" id={`${id}-status`}>{error ? <><span role="status">No se pudo cargar la lista.</span><button type="button" disabled={disabled || loading} onClick={() => { setError(""); setLoading(true); setRevision(v => v + 1); }}>Reintentar</button></> : loading ? <span role="status">Consultando rifas…</span> : <button type="button" disabled={disabled} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Cargar más rifas ({items.length} de {total})</button>}</div>}
  </div>;
}

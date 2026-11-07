"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { components } from "@sorteos/api-client";
import { Alert, Badge, Button, ButtonLink, Card, Input } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { adminFetch, navigateAdmin } from "./client";
import { localTransferTime, parseMinor, type AdminSession } from "./types";
import { OperationalSummary, raffleStates, type AdminRaffle } from "./operations";
type Draft = components["schemas"]["CreateRaffleDto"];
type Photo = components["schemas"]["RaffleMediaInputDto"] & { url: string };
const dateInput = (value?: string | null) => value ? new Date(Date.parse(value) - 4 * 3600000).toISOString().slice(0, 16) : "";
const minorInput = (value: number) => `${BigInt(value) / 100n}.${String(BigInt(value) % 100n).padStart(2, "0")}`;
export function RaffleEditor({ id, role }: { id?: string; role: AdminSession["role"] }) {
  const [row, setRow] = useState<AdminRaffle | null>(null), [error, setError] = useState(""), [revision, setRevision] = useState(0), [notice, setNotice] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    adminFetch<AdminRaffle>(`/admin/api/raffles/${id}`).then(row => { if (active) setRow(row); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [id, revision]);
  const reload = () => { setError(""); setRow(null); setRevision(v => v + 1); };
  if (error) return <Alert title="No se pudo cargar la rifa" tone="error">{error}<Button onClick={reload}>Reintentar</Button></Alert>;
  if (id && row?.id !== id) return <p role="status">Cargando rifa…</p>;
  return <>{notice && <p role="status">Rifa actualizada.</p>}<RaffleForm key={`${id ?? "new"}-${row?.version ?? 0}`} current={row} role={role} onSaved={value => { setRow(value); setNotice(true); }} onReload={reload} />{id && <OperationalSummary key={row?.version} id={id} />}</>;
}
function RaffleForm({ current, role, onSaved, onReload }: { current: AdminRaffle | null; role: AdminSession["role"]; onSaved: (value: AdminRaffle) => void; onReload: () => void }) {
  const hydrated = useHydrated();
  const [photos, setPhotos] = useState<Photo[]>(() => current?.media.map((photo, i) => ({ ...photo, url: current.images[i]!.url })) ?? []);
  const [preview, setPreview] = useState<Draft | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false), [dirty, setDirty] = useState(false);
  const [action, setAction] = useState<"publish" | "pause" | "resume" | "close" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null), flight = useRef(false);
  const editable = !current || ["DRAFT", "PAUSED"].includes(current.status);
  useEffect(() => { if (action) dialog.current?.showModal(); }, [action]);
  async function upload(file?: File) {
    if (!file || busy) return;
    if (file.size > 5 * 1024 * 1024) { setError("La foto debe pesar como máximo 5 MiB."); return; }
    if (photos.length >= 8) { setError("Puedes añadir hasta ocho fotografías."); return; }
    setBusy(true); setError(""); const form = new FormData(); form.set("image", file);
    try { const result = await adminFetch<components["schemas"]["MediaUploadDto"]>("/admin/api/media", { method: "POST", body: form }); setPhotos(value => [...value, { ...result, alt: "Fotografía del premio", rightsConfirmed: false }]); setDirty(true); }
    catch (error) { setError(error instanceof Error ? error.message : "No se pudo subir la foto."); } finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (flight.current) return; setError(""); setSaved(false);
    const form = new FormData(event.currentTarget), value = (key: string) => String(form.get(key) ?? "").trim();
    try {
      const draft: Draft = { slug: value("slug"), title: value("title"), description: value("description"), prize: value("prize"), totalTickets: current?.totalTickets ?? Number(value("totalTickets")), ticketPriceMinor: current?.hasCommitments ? current.ticketPriceMinor : parseMinor(value("price")), minPurchase: Number(value("minPurchase")), maxPurchase: Number(value("maxPurchase")), rules: value("rules"), rulesVersion: value("rulesVersion"), startsAt: value("startsAt") ? localTransferTime(value("startsAt")) : null, endsAt: value("endsAt") ? localTransferTime(value("endsAt")) : null, images: photos.map(({ storageKey, alt, rightsConfirmed }) => ({ storageKey, alt, rightsConfirmed })) };
      if (draft.minPurchase > draft.maxPurchase || draft.maxPurchase > draft.totalTickets) throw new Error("Revisa el mínimo, el máximo y la cantidad total de números.");
      if (draft.startsAt && draft.endsAt && draft.startsAt >= draft.endsAt) throw new Error("La fecha de cierre debe ser posterior al inicio.");
      setPreview(draft);
      if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "preview") return;
      flight.current = true; setBusy(true);
      const result = await adminFetch<AdminRaffle>(current ? `/admin/api/raffles/${current.id}` : "/admin/api/raffles", { method: current ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, ...(current ? { expectedVersion: current.version } : {}) }) });
      if (!current) navigateAdmin(`/admin/rifas/${result.id}`); else { onSaved(result); setDirty(false); setSaved(true); }
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo guardar la rifa."); } finally { flight.current = false; setBusy(false); }
  }
  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!current || !action || flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try {
      const body = action === "close" ? { expectedVersion: current.version } : action === "pause" ? {} : { rulesApproved: true, requirementsReviewed: true, mediaRightsConfirmed: true };
      const result = await adminFetch<AdminRaffle>(`/admin/api/raffles/${current.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      dialog.current?.close(); setAction(null); onSaved(result);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo cambiar el estado."); } finally { flight.current = false; setBusy(false); }
  }
  const actionName = { publish: "Publicar rifa", pause: "Pausar rifa", resume: "Reanudar rifa", close: "Cerrar rifa" };
  return <><div className="admin-toolbar"><Badge>{current ? raffleStates[current.status] : "Nuevo borrador"}</Badge><ButtonLink className="button-secondary" href="/admin/rifas" prefetch={false}>Volver a rifas</ButtonLink>{current && <Button className="button-secondary" onClick={onReload} disabled={busy}>Recargar datos guardados</Button>}</div>
    {error && !action && <Alert title="No se pudo completar la operación" tone="error">{error}</Alert>}{saved && <p role="status">Rifa guardada.</p>}
    <Card><h2>{current ? current.title : "Configurar rifa"}</h2>{!editable && <Alert title="Edición bloqueada">Pausa la rifa para editarla. Una rifa cerrada conserva sus datos y no se puede reabrir.</Alert>}
      <form className="admin-form raffle-form" onSubmit={submit} onChange={() => { setDirty(true); setPreview(null); }}><fieldset disabled={!editable || busy || !hydrated}>
        <div className="admin-detail-grid"><Input id="raffle-title" name="title" label="Título" required maxLength={180} defaultValue={current?.title} /><Input id="raffle-slug" name="slug" label="Identificador de la página" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} hint="Letras minúsculas, números y guiones. Debe ser único." defaultValue={current?.slug} /></div>
        <div className="field"><label htmlFor="raffle-description">Descripción</label><textarea id="raffle-description" name="description" rows={4} maxLength={20000} defaultValue={current?.description} /></div><Input id="raffle-prize" name="prize" label="Premio" required maxLength={2000} defaultValue={current?.prize} />
        <div className="admin-detail-grid"><Input id="raffle-total" name="totalTickets" label="Cantidad total de números" type="number" min={1} max={1000000} required defaultValue={current?.totalTickets ?? 100} disabled={!!current || busy || !editable} hint={current ? "La numeración es inmutable desde la creación. Crea otra rifa para cambiarla." : "Los compradores indican cantidad; el servidor asigna los números."} /><Input id="raffle-price" name="price" label="Precio por número en RD$" inputMode="decimal" required defaultValue={minorInput(current?.ticketPriceMinor ?? 10000)} disabled={current?.hasCommitments || busy || !editable} hint={current?.hasCommitments ? "Precio bloqueado: esta rifa ya tuvo una pre-reserva, incluso si venció." : "Importe con hasta dos decimales."} /><Input id="raffle-min" name="minPurchase" label="Compra mínima" type="number" required min={1} max={1000000} defaultValue={current?.minPurchase ?? 1} /><Input id="raffle-max" name="maxPurchase" label="Compra máxima" type="number" required min={1} max={1000000} defaultValue={current?.maxPurchase ?? 10} /><Input id="raffle-start" name="startsAt" label="Inicio de ventas (hora dominicana)" type="datetime-local" defaultValue={dateInput(current?.startsAt)} /><Input id="raffle-end" name="endsAt" label="Fin de ventas (hora dominicana)" type="datetime-local" defaultValue={dateInput(current?.endsAt)} /></div>
        <div className="field"><label htmlFor="raffle-rules">Reglas de la rifa</label><textarea id="raffle-rules" name="rules" required rows={7} maxLength={20000} defaultValue={current?.rules} /></div><Input id="raffle-rules-version" name="rulesVersion" label="Versión de reglas" required maxLength={100} defaultValue={current?.rulesVersion ?? "1"} />
        <h3>Fotografías propias del premio</h3><p>Fotos públicas, nunca comprobantes ni datos de compradores. JPG, PNG, WebP o AVIF; hasta 5 MiB por foto. Máximo ocho.</p><Input id="raffle-photo" label="Añadir fotografía propia" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
        <div className="admin-photo-grid">{photos.map((photo, i) => <div key={photo.storageKey}><Image src={photo.url} alt={photo.alt} width={500} height={350} unoptimized /><Input id={`photo-alt-${i}`} label={`Descripción de foto ${i + 1}`} required maxLength={500} value={photo.alt} onChange={event => setPhotos(photos.map((value, n) => n === i ? { ...value, alt: event.target.value } : value))} /><label className="admin-check"><input type="checkbox" checked={photo.rightsConfirmed} onChange={event => setPhotos(photos.map((value, n) => n === i ? { ...value, rightsConfirmed: event.target.checked } : value))} />Tengo derechos para publicar esta foto.</label><Button type="button" className="button-secondary" onClick={() => { setPhotos(photos.filter((_, n) => n !== i)); setDirty(true); }}>Quitar foto {i + 1} del borrador</Button></div>)}</div>
        <div className="admin-toolbar"><Button type="submit" disabled={busy}>{busy ? "Procesando…" : "Guardar borrador y cambios"}</Button><Button className="button-secondary" type="submit" name="intent" value="preview">Vista previa</Button></div>
      </fieldset></form>
    </Card>
    {preview && <Card className="raffle-preview"><p className="eyebrow">Vista previa · no publica la rifa</p><h2>{preview.title}</h2><p>{preview.prize}</p><p>{formatMoney(preview.ticketPriceMinor)} por número · {preview.totalTickets} números</p><p className="rules-text">{preview.description}</p><h3>Reglas · {preview.rulesVersion}</h3><p className="rules-text">{preview.rules}</p></Card>}
    {current && <Card><h2>Estado de publicación</h2><p>Publicar y reanudar exigen aprobación expresa del propietario. Cerrar exige pausar y esperar a que finalicen las pre-reservas vigentes; conserva las órdenes y sus reservas.</p>{dirty && <p role="status">Guarda los cambios antes de cambiar el estado.</p>}<div className="admin-toolbar">
      {current.status === "DRAFT" && role === "OWNER" && <Button disabled={busy || dirty} onClick={() => { setError(""); setAction("publish"); }}>Publicar rifa</Button>}{current.status === "PUBLISHED" && <Button disabled={busy || dirty} onClick={() => { setError(""); setAction("pause"); }}>Pausar rifa</Button>}{current.status === "PAUSED" && role === "OWNER" && <><Button disabled={busy || dirty} onClick={() => { setError(""); setAction("resume"); }}>Reanudar rifa</Button><Button className="button-secondary" disabled={busy || dirty} onClick={() => { setError(""); setAction("close"); }}>Cerrar rifa</Button></>}{current.status === "PUBLISHED" && <ButtonLink className="button-secondary" href={`/rifas/${current.slug}`}>Ver página pública</ButtonLink>}
    </div>{current.status === "CLOSED" && <p>Ventas cerradas. Continúa conciliando las órdenes existentes en Órdenes y revisión.</p>}</Card>}
    <dialog className="admin-dialog" ref={dialog} onCancel={event => { if (busy) event.preventDefault(); else setAction(null); }} aria-labelledby="raffle-action-title">{action && <form className="admin-form" onSubmit={transition}><h2 id="raffle-action-title">{actionName[action]}</h2><p>{current?.title}</p>{error && <Alert title="La acción no se completó" tone="error">{error}</Alert>}{["publish", "resume"].includes(action) ? <><label className="admin-check"><input type="checkbox" required disabled={busy} />Apruebo las reglas y su versión actual.</label><label className="admin-check"><input type="checkbox" required disabled={busy} />He revisado los requisitos aplicables y autorizo publicar esta rifa.</label><label className="admin-check"><input type="checkbox" required disabled={busy} />Confirmo los derechos de todas las fotografías.</label></> : <label className="admin-check"><input type="checkbox" required disabled={busy} />{action === "close" ? "Entiendo que el cierre es irreversible, no realiza un sorteo y conserva las órdenes por conciliar." : "Detener nuevas compras; quienes tienen una pre-reserva vigente pueden completar su envío."}</label>}<div className="admin-toolbar"><Button disabled={busy}>{busy ? "Procesando…" : "Confirmar " + actionName[action].toLowerCase()}</Button><Button type="button" className="button-secondary" disabled={busy} onClick={() => { dialog.current?.close(); setAction(null); }}>Volver sin cambiar</Button></div></form>}</dialog>
  </>;
}

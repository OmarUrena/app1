import type { Metadata } from "next";
import { Alert, ButtonLink, EmptyState, SectionContainer } from "@/components/ui";
import { getCatalog } from "@/features/raffles/data";
import { RaffleCatalog } from "@/features/raffles/catalog";

export const metadata: Metadata = { title: "Explorar rifas" };
export default async function RafflesPage() {
  const { mode, items } = await getCatalog();
  return <SectionContainer><div className="page-heading"><p className="eyebrow">Tu próxima ilusión</p><h1>Encuentra lo que<br /><em>te mueve.</em></h1><p>Explora los premios, conoce las reglas y descubre cada detalle.</p></div><div className="page-content">
    {mode === "mock" ? <RaffleCatalog raffles={items} /> : <EmptyState title="Estamos preparando el catálogo" action={<ButtonLink href="/" className="button-secondary">Volver al inicio</ButtonLink>}>Las rifas se mostrarán cuando se habilite el catálogo conectado. No se ha consultado disponibilidad ni se aceptan compras.</EmptyState>}
    <div className="catalog-note"><Alert title="Información clara desde el principio">Tú eliges la cantidad de boletos. Los números se asignan en el servidor al recibir la orden con comprobante; el pago se verifica manualmente.</Alert></div>
    <ButtonLink href="/" className="button-secondary catalog-back">Volver al inicio</ButtonLink>
  </div></SectionContainer>;
}

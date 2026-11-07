import { SectionContainer } from "@/components/ui";
export default function Loading() {
  return <SectionContainer className="section"><div role="status"><span className="sr-only">Cargando contenido…</span><div aria-hidden="true"><div className="skeleton skeleton-title" /><div className="skeleton" /><div className="skeleton skeleton-card" /></div></div></SectionContainer>;
}

import { SectionContainer } from "@/components/ui";
import { AdminFrame } from "@/features/admin/orders";
import { RaffleEditor } from "@/features/admin/raffle-editor";
import { requireAdmin } from "@/features/admin/server";
export default async function NewRafflePage() { const session = await requireAdmin(); return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Crear rifa</h1><p>Guarda primero un borrador y revisa los requisitos antes de publicarlo.</p></div><AdminFrame session={session}><RaffleEditor role={session.role} /></AdminFrame></SectionContainer>; }

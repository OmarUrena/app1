import { SectionContainer } from "@/components/ui";
import { AdminFrame } from "@/features/admin/orders";
import { RafflesList } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export default async function RafflesPage() { const session = await requireAdmin(); return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Mis rifas</h1><p>Configura el premio, las reglas y las ventas.</p></div><AdminFrame session={session}><RafflesList /></AdminFrame></SectionContainer>; }

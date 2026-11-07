import { SectionContainer } from "@/components/ui";
import { AdminFrame } from "@/features/admin/orders";
import { OperationalSummary } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export default async function AdminPage() { const session = await requireAdmin(); return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Operación diaria</h1><p>Ventas, inventario y conciliación de tus rifas.</p></div><AdminFrame session={session}><OperationalSummary /></AdminFrame></SectionContainer>; }

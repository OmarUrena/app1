import { SectionContainer } from "@/components/ui";
import { AdminFrame } from "@/features/admin/orders";
import { OrdersExport } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export default async function ReportsPage() { const session = await requireAdmin(); return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Reportes</h1></div><AdminFrame session={session}><OrdersExport owner={session.role === "OWNER"} /></AdminFrame></SectionContainer>; }

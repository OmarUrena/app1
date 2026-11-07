import { ButtonLink } from "@/components/ui";
import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { OperationalSummary } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Resumen de operaciones" };
export default async function AdminPage() { const session = await requireAdmin(); return <AdminFrame session={session}><AdminPageHeading title="Resumen de operaciones" section="Visión general" description="Consulta los ingresos, la disponibilidad y las órdenes que requieren atención."><ButtonLink href="/admin/ordenes" prefetch={false}>Revisar órdenes</ButtonLink></AdminPageHeading><OperationalSummary /></AdminFrame>; }

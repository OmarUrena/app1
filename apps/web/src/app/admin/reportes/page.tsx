import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { OrdersExport } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Reportes de operación" };
export default async function ReportsPage() { const session = await requireAdmin(); return <AdminFrame session={session}><AdminPageHeading title="Reportes de operación" section="Control financiero" description="Genera un archivo de órdenes para revisar y organizar la información del negocio." /><OrdersExport owner={session.role === "OWNER"} /></AdminFrame>; }

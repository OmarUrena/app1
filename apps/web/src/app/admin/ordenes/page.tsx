import { SectionContainer } from "@/components/ui";
import { AdminFrame, OrdersList } from "@/features/admin/orders";
import { requireAdmin } from "@/features/admin/server";
export default async function OrdersPage() {
  const session = await requireAdmin();
  return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Revisión de órdenes</h1><p>Conciliación manual de transferencias y comprobantes.</p></div><AdminFrame session={session}><OrdersList /></AdminFrame></SectionContainer>;
}

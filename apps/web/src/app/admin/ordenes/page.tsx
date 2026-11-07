import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { OrdersList } from "@/features/admin/orders";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Gestión de órdenes" };
export default async function OrdersPage() {
  const session = await requireAdmin();
  return <AdminFrame session={session}><AdminPageHeading title="Gestión de órdenes" description="Consulta las compras y revisa los pagos reportados por tus clientes." /><OrdersList /></AdminFrame>;
}

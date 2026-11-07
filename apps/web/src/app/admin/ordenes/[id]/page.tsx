import { notFound } from "next/navigation";
import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { OrderDetail } from "@/features/admin/orders";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Detalle de orden" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(), { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) notFound();
  return <AdminFrame session={session}><AdminPageHeading title="Detalle de orden" description="Verifica el comprobante, consulta el historial y registra una decisión." /><OrderDetail id={id} role={session.role} /></AdminFrame>;
}

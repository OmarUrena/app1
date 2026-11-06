import { notFound } from "next/navigation";
import { SectionContainer } from "@/components/ui";
import { AdminFrame, OrderDetail } from "@/features/admin/orders";
import { requireAdmin } from "@/features/admin/server";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin(), { id } = await params;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) notFound();
  return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Detalle de orden</h1></div><AdminFrame session={session}><OrderDetail id={id} role={session.role} /></AdminFrame></SectionContainer>;
}

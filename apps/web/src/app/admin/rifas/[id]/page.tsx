import { notFound } from "next/navigation";
import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { RaffleEditor } from "@/features/admin/raffle-editor";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Administrar rifa" };
export default async function RafflePage({ params }: { params: Promise<{ id: string }> }) { const session = await requireAdmin(), { id } = await params; if (!/^[a-f0-9-]{36}$/i.test(id)) notFound(); return <AdminFrame session={session}><AdminPageHeading title="Administrar rifa" section="Catálogo" description="Edita la configuración, administra la publicación y consulta los resultados de venta." /><RaffleEditor id={id} role={session.role} /></AdminFrame>; }

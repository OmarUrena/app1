import { notFound } from "next/navigation";
import { SectionContainer } from "@/components/ui";
import { AdminFrame } from "@/features/admin/orders";
import { RaffleEditor } from "@/features/admin/raffle-editor";
import { requireAdmin } from "@/features/admin/server";
export default async function RafflePage({ params }: { params: Promise<{ id: string }> }) { const session = await requireAdmin(), { id } = await params; if (!/^[a-f0-9-]{36}$/i.test(id)) notFound(); return <SectionContainer><div className="page-heading"><p className="eyebrow">Administración</p><h1>Administrar rifa</h1></div><AdminFrame session={session}><RaffleEditor id={id} role={session.role} /></AdminFrame></SectionContainer>; }

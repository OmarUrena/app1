import { ButtonLink } from "@/components/ui";
import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { RafflesList } from "@/features/admin/operations";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Administración de rifas" };
export default async function RafflesPage() { const session = await requireAdmin(); return <AdminFrame session={session}><AdminPageHeading title="Administración de rifas" section="Catálogo" description="Organiza tus rifas y controla su publicación, inventario y ventas."><ButtonLink href="/admin/rifas/nueva" prefetch={false}>Crear rifa</ButtonLink></AdminPageHeading><RafflesList /></AdminFrame>; }

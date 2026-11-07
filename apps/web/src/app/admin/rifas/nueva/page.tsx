import { AdminFrame, AdminPageHeading } from "@/features/admin/frame";
import { RaffleEditor } from "@/features/admin/raffle-editor";
import { requireAdmin } from "@/features/admin/server";
export const metadata = { title: "Crear rifa" };
export default async function NewRafflePage() { const session = await requireAdmin(); return <AdminFrame session={session}><AdminPageHeading title="Crear rifa" section="Catálogo" description="Completa la información y guarda un borrador. La publicación se confirma por separado." /><RaffleEditor role={session.role} /></AdminFrame>; }

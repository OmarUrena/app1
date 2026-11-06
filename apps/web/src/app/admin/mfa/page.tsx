import { SectionContainer } from "@/components/ui";
import { MfaForm } from "@/features/admin/auth";
import { requireAdmin } from "@/features/admin/server";
export default async function MfaPage() {
  await requireAdmin(true);
  return <SectionContainer><div className="narrow"><div className="page-heading"><p className="eyebrow">Área restringida</p><h1>Confirma tu identidad</h1></div><MfaForm /></div></SectionContainer>;
}

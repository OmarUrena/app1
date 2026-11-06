import { SectionContainer } from "@/components/ui";
import { MfaForm } from "@/features/admin/auth";
import { requireAdmin } from "@/features/admin/server";
import { localLoginTest } from "@/lib/config";
import { redirect } from "next/navigation";
export default async function MfaPage() {
  const admin = await requireAdmin(true);
  if (!admin.mfaRequired) redirect("/admin/ordenes");
  if (admin.mfaRequired && localLoginTest(process.env)) redirect("/admin/prueba-acceso");
  return <SectionContainer><div className="narrow"><div className="page-heading"><p className="eyebrow">Área restringida</p><h1>Confirma tu identidad</h1></div><MfaForm /></div></SectionContainer>;
}

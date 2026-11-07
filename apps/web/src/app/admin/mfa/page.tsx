import { AdminAuthLayout } from "@/features/admin/frame";
import { MfaForm } from "@/features/admin/auth";
import { requireAdmin } from "@/features/admin/server";
import { localLoginTest } from "@/lib/config";
import { redirect } from "next/navigation";
export const metadata = { title: "Verificación de identidad" };
export default async function MfaPage() {
  const admin = await requireAdmin(true);
  if (!admin.mfaRequired) redirect("/admin/ordenes");
  if (admin.mfaRequired && localLoginTest(process.env)) redirect("/admin/prueba-acceso");
  return <AdminAuthLayout title="Confirma tu identidad" description="Completa la verificación para continuar con tu sesión administrativa."><MfaForm /></AdminAuthLayout>;
}

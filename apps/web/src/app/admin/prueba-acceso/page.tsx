import { redirect } from "next/navigation";
import { Alert, ButtonLink, Card } from "@/components/ui";
import { AdminAuthLayout } from "@/features/admin/frame";
import { LogoutButton } from "@/features/admin/auth";
import { requireAdmin } from "@/features/admin/server";
import { localLoginTest } from "@/lib/config";
export const metadata = { title: "Prueba de acceso" };

export default async function LoginTestPage() {
  const trial = localLoginTest(process.env);
  if (!trial) redirect("/admin");
  const admin = await requireAdmin(true);
  if (!admin.mfaRequired) redirect("/admin/ordenes");
  const expiry = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "short", timeStyle: "short" }).format(trial.expiresAt);
  return <AdminAuthLayout title="Prueba de acceso" description="Comprueba el acceso autorizado de tu cuenta."><Card>
    <h1>Inicio de sesión verificado</h1>
    <p>Tu cuenta administradora está autorizada y tu sesión está vigente.</p>
    <p>Rol: {admin.role === "OWNER" ? "Propietario" : "Administrador"}.</p>
    <Alert title="Prueba temporal sin TOTP">
      <p>Puedes comprobar el inicio y cierre de sesión hasta el {expiry}, hora de Santo Domingo.</p>
      <p>Para consultar órdenes, comprobantes o revisar pagos se requiere la verificación en dos pasos.</p>
    </Alert>
    <div className="admin-toolbar"><LogoutButton /><ButtonLink href="/" className="button-secondary">Volver al inicio</ButtonLink></div>
  </Card></AdminAuthLayout>;
}

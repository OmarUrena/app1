import type { Metadata } from "next";
import { Alert, Card } from "@/components/ui";
import { AdminAuthLayout } from "@/features/admin/frame";
import { LoginForm } from "@/features/admin/auth";
import { adminConfigured, tokens } from "@/features/admin/server";
import { localLoginTest } from "@/lib/config";
export const metadata: Metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ cierre?: string }> }) {
  const configured = adminConfigured(), stored = await tokens();
  const withoutTotp = Boolean(localLoginTest(process.env));
  const pending = (await searchParams).cierre === "pendiente";
  return <AdminAuthLayout title="Administración" description="Inicia sesión para acceder a tu espacio de trabajo.">{pending && <Alert title="Revocación remota pendiente" tone="error">Las credenciales locales se eliminaron. No pudimos confirmar el cierre en el proveedor de autenticación. Sigue el procedimiento de seguridad acordado con el propietario para revocar esa sesión.</Alert>}{configured ? <LoginForm canResume={Boolean(stored.refresh_token)} withoutTotp={withoutTotp} /> : <Card><h2>Acceso no disponible</h2><Alert title="Autenticación sin configurar">El acceso administrativo requiere la configuración de Auth y API en el servidor. No se reciben credenciales en esta pantalla.</Alert></Card>}</AdminAuthLayout>;
}

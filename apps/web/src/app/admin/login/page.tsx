import type { Metadata } from "next";
import { Alert, ButtonLink, Card, SectionContainer } from "@/components/ui";
import { LoginForm } from "@/features/admin/auth";
import { adminConfigured, tokens } from "@/features/admin/server";
import { localLoginTest } from "@/lib/config";
export const metadata: Metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ cierre?: string }> }) {
  const configured = adminConfigured(), stored = await tokens();
  const withoutTotp = Boolean(localLoginTest(process.env));
  const pending = (await searchParams).cierre === "pendiente";
  return <SectionContainer><div className="narrow"><div className="page-heading"><p className="eyebrow">Área restringida</p><h1>Administración</h1><p>Acceso exclusivo para personal autorizado.</p></div><div className="page-content">{pending && <Alert title="Revocación remota pendiente" tone="error">Las credenciales locales se eliminaron. No pudimos confirmar el cierre en el proveedor de autenticación. Sigue el procedimiento de seguridad acordado con el propietario para revocar esa sesión.</Alert>}{configured ? <LoginForm canResume={Boolean(stored.refresh_token)} withoutTotp={withoutTotp} /> : <Card><h2>Acceso no disponible</h2><Alert title="Autenticación sin configurar">El acceso administrativo requiere la configuración de Auth y API en el servidor. No se reciben credenciales en esta pantalla.</Alert></Card>}<ButtonLink href="/" className="button-secondary">Volver al inicio</ButtonLink></div></div></SectionContainer>;
}

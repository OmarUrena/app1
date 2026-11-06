"use client";
import { Alert, Button, ButtonLink, SectionContainer } from "@/components/ui";
import { LogoutButton } from "@/features/admin/auth";
export default function AdminErrorPage({ retry }: { error: Error; retry: () => void }) {
  return <SectionContainer><div className="page-heading"><h1>No se pudo verificar el acceso</h1></div><Alert tone="error" title="Administración no disponible">La sesión, los permisos o los servicios no pudieron verificarse. No se muestran datos privados.</Alert><div className="admin-toolbar"><Button onClick={retry}>Volver a intentar</Button><ButtonLink href="/admin/login">Ir al acceso</ButtonLink><LogoutButton /></div></SectionContainer>;
}

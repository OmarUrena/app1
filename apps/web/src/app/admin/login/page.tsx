import type { Metadata } from "next";
import { Alert, ButtonLink, Card, SectionContainer } from "@/components/ui";
export const metadata: Metadata = { title: "Acceso administrativo", robots: { index: false, follow: false } };
export default function AdminLoginPage() {
  return <SectionContainer><div className="narrow"><div className="page-heading"><p className="eyebrow">Área restringida</p><h1>Administración</h1><p>Acceso exclusivo para personal autorizado.</p></div><div className="page-content"><Card><h2>Acceso en preparación</h2><Alert title="La autenticación aún no está habilitada">No se reciben credenciales en esta pantalla. El acceso requerirá autenticación y autorización verificadas por el servidor.</Alert><p className="mt-6">La revisión de pagos y los datos de compradores permanecerán protegidos.</p><ButtonLink href="/" className="button-secondary">Volver al inicio</ButtonLink></Card></div></div></SectionContainer>;
}

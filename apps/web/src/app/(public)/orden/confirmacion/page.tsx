import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Alert, SectionContainer } from "@/components/ui";
import { readEnvironment } from "@/lib/config";
import { ProtectedConfirmation } from "@/features/orders/confirmation";

export const metadata: Metadata = { title: "Consulta protegida de orden", robots: { index: false, follow: false } };
export default async function ConfirmationPage() {
  const locator = (await cookies()).get("sorteos_order_locator")?.value;
  const { apiBaseUrl, mode } = readEnvironment(process.env);
  return <SectionContainer className="section">{mode === "mock" ? <><h1>Sin órdenes en esta demostración</h1><p>El modo demo no crea ni confirma pedidos.</p></> : apiBaseUrl ? <ProtectedConfirmation key={locator ?? "none"} baseUrl={apiBaseUrl} code={locator && /^RF-[A-Z0-9]{16,64}$/.test(locator) ? locator : null} /> : <><h1>No pudimos preparar la consulta</h1><Alert title="La consulta no está disponible">Inténtalo más tarde. No vuelvas a enviar una orden que ya haya sido registrada.</Alert></>}</SectionContainer>;
}

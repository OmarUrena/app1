import type { Metadata } from "next";
import { connection } from "next/server";
import { Alert, SectionContainer } from "@/components/ui";
import { OrderRecovery } from "@/features/orders/recovery";
import { readEnvironment } from "@/lib/config";
export const metadata: Metadata = { title: "Recuperar el mismo envío", robots: { index: false, follow: false } };
export default async function RecoveryPage() {
  await connection();
  const { mode, apiBaseUrl, receiptMaxBytes } = readEnvironment(process.env);
  return <SectionContainer className="section"><h1>Recupera el mismo envío.</h1>{mode === "mock" ? <p>La demostración no crea ni recupera órdenes.</p> : apiBaseUrl ? <OrderRecovery baseUrl={apiBaseUrl} maxBytes={receiptMaxBytes} /> : <Alert title="La recuperación no está disponible">Inténtalo más tarde. Si ya enviaste una orden o transferiste, conserva el comprobante y no repitas el pago.</Alert>}</SectionContainer>;
}

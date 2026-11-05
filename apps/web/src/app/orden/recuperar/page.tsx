import type { Metadata } from "next";
import { SectionContainer } from "@/components/ui";
import { OrderRecovery } from "@/features/orders/recovery";
import { readEnvironment } from "@/lib/config";
export const metadata: Metadata = { title: "Recuperar el mismo envío", robots: { index: false, follow: false } };
export default function RecoveryPage() {
  const { mode, apiBaseUrl, receiptMaxBytes } = readEnvironment(process.env);
  return <SectionContainer className="section"><h1>Recupera el mismo envío.</h1>{mode === "live" && apiBaseUrl ? <OrderRecovery baseUrl={apiBaseUrl} maxBytes={receiptMaxBytes} /> : <p>La demostración no crea ni recupera órdenes.</p>}</SectionContainer>;
}

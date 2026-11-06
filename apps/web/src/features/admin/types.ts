import type { components } from "@sorteos/api-client";
export type AdminSession = components["schemas"]["AdminSessionDto"];
export type AdminOrder = components["schemas"]["AdminOrderDetailDto"];
export type OrderPage = components["schemas"]["AdminOrdersPageDto"];
export type FinancialResult = components["schemas"]["FinancialResultDto"];
export type ActionName = "start-review" | "approve" | "request-resolution" | "cancel";
export type ActionBody = components["schemas"]["ReviewDto"] | components["schemas"]["ApproveDto"] | components["schemas"]["ResolutionDto"] | components["schemas"]["CancelDto"];
export const statuses = { PENDING_REVIEW: "Pendiente de verificación", UNDER_REVIEW: "En revisión", NEEDS_RESOLUTION: "Requiere resolución", PAID: "Pago confirmado", CANCELLED: "Cancelada" } as const;
export function statusLabel(status: string) { return statuses[status as keyof typeof statuses] ?? status; }
export function reportLabel(status: string) {
  return ({ REPORTED: "Comprobante recibido", UNDER_REVIEW: "En revisión", VERIFIED: "Verificado", DISPUTED: "Cuestionado", INVALID: "Inválido", REFUNDED: "Reembolsado" } as Record<string, string>)[status] ?? status;
}
export function actionLabel(action: string) {
  return ({ START_REVIEW: "Inicio de revisión", APPROVE: "Pago aprobado", REQUEST_RESOLUTION: "Resolución solicitada", CANCEL: "Cancelación conciliada" } as Record<string, string>)[action] ?? action;
}

export function parseMinor(value: string): number {
  if (!/^\d{1,14}(?:[.,]\d{1,2})?$/.test(value)) throw new Error("Introduce un importe válido con hasta dos decimales.");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const amount = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (amount < 1n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("El importe está fuera del rango permitido.");
  return Number(amount);
}

export function localTransferTime(value: string): string {
  // The form explicitly uses Dominican local time (UTC-04:00), independent of device timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Indica la fecha y hora del banco.");
  const date = new Date(value + ":00-04:00");
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha no válida.");
  return date.toISOString();
}

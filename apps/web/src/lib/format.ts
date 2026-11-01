export function formatMoney(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError("Importe inválido.");
  const whole = BigInt(amountMinor) / 100n;
  const cents = String(amountMinor % 100).padStart(2, "0");
  return `RD$ ${new Intl.NumberFormat("es-DO").format(whole)}.${cents}`;
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(value));
}

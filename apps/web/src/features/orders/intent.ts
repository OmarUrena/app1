import type { OrderFields } from "./api";
export const orderIntentKey = "sorteos:order:intent:v1";
export type OrderIntent = { key: string; holdId: string; fingerprint: string; bankAccountId: string; rulesVersion: string; uncertain: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readOrderIntent(storage: Pick<Storage, "getItem">): OrderIntent | null {
  const raw = storage.getItem(orderIntentKey); if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("key" in value) || typeof value.key !== "string" || !uuid.test(value.key) || !("holdId" in value) || typeof value.holdId !== "string" || !uuid.test(value.holdId) || !("fingerprint" in value) || typeof value.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(value.fingerprint) || !("bankAccountId" in value) || typeof value.bankAccountId !== "string" || !uuid.test(value.bankAccountId) || !("rulesVersion" in value) || typeof value.rulesVersion !== "string" || value.rulesVersion.length > 100 || !("uncertain" in value) || typeof value.uncertain !== "boolean") throw new Error("INVALID_ORDER_INTENT");
  return { key: value.key, holdId: value.holdId, fingerprint: value.fingerprint, bankAccountId: value.bankAccountId, rulesVersion: value.rulesVersion, uncertain: value.uncertain };
}
export function writeOrderIntent(storage: Pick<Storage, "setItem">, intent: OrderIntent) { storage.setItem(orderIntentKey, JSON.stringify(intent)); }
async function sha(bytes: BufferSource) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join(""); }
export async function fingerprint(fields: OrderFields, file: File) {
  const fileHash = await sha(await file.arrayBuffer());
  const value = [fields.holdId, fields.customerName, fields.customerPhone, fields.customerEmail, fields.bankAccountId, fields.bankReference, fields.transferDate, fields.acceptedRulesVersion, fileHash, file.type];
  return sha(new TextEncoder().encode(JSON.stringify(value)));
}
export function transferDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}:00-04:00`);
  return Number.isFinite(parsed.getTime()) && new Date(parsed.getTime() - 14400000).toISOString().slice(0, 16) === value ? parsed.toISOString() : null;
}
export function validReceipt(file: File | null, maximum: number) {
  return !!file && file.size > 0 && file.size <= maximum && ["image/jpeg", "image/png", "application/pdf"].includes(file.type);
}

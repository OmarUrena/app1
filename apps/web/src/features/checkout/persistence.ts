// Non-secret recovery metadata only. The access credential remains an HttpOnly cookie.
export const intentStorageKey = "sorteos:checkout:intent:v1";
export type Intent = { key: string; raffleId: string; slug: string; quantity: number; holdId?: string; sessionReady?: boolean; uncertain?: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readIntent(storage: Pick<Storage, "getItem">): Intent | null {
  const raw = storage.getItem(intentStorageKey);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("key" in value) || typeof value.key !== "string" || !uuid.test(value.key) || !("raffleId" in value) || typeof value.raffleId !== "string" || !uuid.test(value.raffleId) || !("slug" in value) || typeof value.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.slug) || !("quantity" in value) || !Number.isSafeInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 1000 || ("holdId" in value && (typeof value.holdId !== "string" || !uuid.test(value.holdId)))) throw new Error("INVALID_INTENT");
  return { key: value.key, raffleId: value.raffleId, slug: value.slug, quantity: Number(value.quantity), ...("holdId" in value ? { holdId: String(value.holdId) } : {}), ...("sessionReady" in value && value.sessionReady === true ? { sessionReady: true } : {}), ...("uncertain" in value && value.uncertain === true ? { uncertain: true } : {}) };
}
export function saveIntent(storage: Pick<Storage, "setItem">, intent: Intent) {
  storage.setItem(intentStorageKey, JSON.stringify(intent));
}
export function remainingSeconds(expiresAt: string, serverTime: string, elapsedMs: number) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.parse(serverTime) - Math.max(0, elapsedMs)) / 1000));
}

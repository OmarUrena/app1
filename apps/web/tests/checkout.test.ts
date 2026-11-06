// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { checkoutApi, type Hold } from "@/features/checkout/api";
import { intentStorageKey, readIntent, remainingSeconds, saveIntent } from "@/features/checkout/persistence";

const key = "11111111-1111-4111-8111-111111111111";
const hold: Hold = { holdId: key, raffleId: key, quantity: 2, unitPriceMinor: 10025, totalMinor: 20050, currency: "DOP", status: "ACTIVE", serverTime: "2026-11-03T12:00:00Z", expiresAt: "2026-11-03T13:00:00Z" };
afterEach(() => vi.unstubAllGlobals());
test("contador usa hora servidor y tiempo transcurrido, sin renovar TTL ni depender del reloj local", () => {
  expect(remainingSeconds(hold.expiresAt, hold.serverTime, 0)).toBe(3600);
  expect(remainingSeconds(hold.expiresAt, hold.serverTime, 3599500)).toBe(1);
  expect(remainingSeconds(hold.expiresAt, hold.serverTime, 3600000)).toBe(0);
  expect(remainingSeconds(hold.expiresAt, hold.serverTime, 7200000)).toBe(0);
});
test("persistencia solo guarda intención no secreta, incluida preparación antes de enviar", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  const intent = { key, raffleId: key, slug: "premio-test", quantity: 2, sessionReady: true, holdId: key };
  expect(readIntent(storage)).toBeNull(); saveIntent(storage, intent);
  expect(readIntent(storage)).toEqual(intent);
  expect(Object.keys(JSON.parse(store.get(intentStorageKey)!)).sort()).toEqual(["holdId", "key", "quantity", "raffleId", "sessionReady", "slug"]);
});
test.each(['{"quantity":2}', '{"key":"token"}', 'bad JSON'])("persistencia rechaza estado inválido: %s", raw => {
  expect(() => readIntent({ getItem: () => raw })).toThrow();
});
test("cliente generado inicializa una sesión a la vez y no devuelve su credencial", async () => {
  let resolve!: () => void;
  const gate = new Promise<void>(done => { resolve = done; });
  const mock = vi.fn(async () => { await gate; return Response.json({ ready: true }); });
  vi.stubGlobal("fetch", mock);
  const api = checkoutApi("http://localhost:3001/api/v1", () => "http://localhost:3000");
  const first = api.session(), second = api.session(); resolve();
  expect(await first).toBeUndefined(); expect(await second).toBeUndefined(); expect(mock).toHaveBeenCalledTimes(1);
});
test("POST serializa una sola cabecera de idempotencia y únicamente rifa/cantidad", async () => {
  const requests: Request[] = [];
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => { requests.push(request); return Response.json(hold); }));
  const api = checkoutApi("http://localhost:3001/api/v1", () => "http://localhost:3000");
  expect(await api.create(key, 2, key)).toEqual(hold);
  const request = requests[0]!;
  expect(request.headers.get("Idempotency-Key")).toBe(key);
  expect(request.credentials).toBe("include"); expect(request.cache).toBe("no-store");
  expect(await request.json()).toEqual({ raffleId: key, quantity: 2 });
});
test("respuesta perdida no dispara reintento automático ni inicializa otra sesión", async () => {
  const mock = vi.fn(async () => { throw new TypeError("PRIVATE NETWORK"); }); vi.stubGlobal("fetch", mock);
  await expect(checkoutApi("http://localhost:3001/api/v1", () => "http://localhost:3000").create(key, 2, key)).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  expect(mock).toHaveBeenCalledTimes(1);
});

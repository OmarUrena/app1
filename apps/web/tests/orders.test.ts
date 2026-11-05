// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/order-locator/route";
import { orderApi, type OrderFields } from "@/features/orders/api";
import { fingerprint, orderIntentKey, readOrderIntent, transferDate, validReceipt, writeOrderIntent } from "@/features/orders/intent";

const id = "11111111-1111-4111-8111-111111111111";
const code = "RF-" + "A".repeat(32);
const fields: OrderFields = { holdId: id, customerName: "CLIENTE TEST", customerPhone: "+18095550100", customerEmail: "test@example.invalid", bankAccountId: id, bankReference: "REFERENCIA TEST", transferDate: "2026-11-04T16:00:00.000Z", acceptedRulesVersion: "TEST-1" };
const file = () => new File([new Uint8Array([1, 2, 3])], "test.png", { type: "image/png" });
const response = { orderCode: code, status: "PENDING_REVIEW", paymentReportStatus: "REPORTED", raffleId: id, raffleTitle: "PREMIO TEST", quantity: 2, ticketNumbers: ["00", "09"], totalMinor: 20050, currency: "DOP", createdAt: "2026-11-04T16:00:00Z", message: "" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
test("multipart usa boundary real, correo y comprobante en el mismo POST, sin precio cliente", async () => {
  let captured: Request | undefined;
  vi.stubGlobal("fetch", vi.fn(async (request: Request) => { captured = request; return Response.json(response, { status: 201 }); }));
  expect(await orderApi("http://localhost:3001/api/v1", () => "http://localhost:3000").submit(fields, file(), id)).toMatchObject({ status: "PENDING_REVIEW" });
  expect(captured!.headers.get("Content-Type")).toMatch(/^multipart\/form-data; boundary=/);
  expect(captured!.headers.get("Idempotency-Key")).toBe(id); expect(captured!.credentials).toBe("include"); expect(captured!.cache).toBe("no-store");
  const body = await captured!.formData(); expect(body.get("customerEmail")).toBe(fields.customerEmail); expect(body.get("receipt")).toBeInstanceOf(File);
  expect(body.has("totalMinor")).toBe(false); expect(body.has("ticketNumbers")).toBe(false);
});
test("no se confirma con un HTTP distinto de 201 ni con números duplicados", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(response, { status: 200 })));
  await expect(orderApi("http://localhost:3001/api/v1", () => "http://localhost:3000").submit(fields, file(), id)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...response, ticketNumbers: ["00", "00"] }, { status: 201 })));
  await expect(orderApi("http://localhost:3001/api/v1", () => "http://localhost:3000").submit(fields, file(), id)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
});
test("huella exige mismos campos y mismos bytes, sin guardar PII ni el archivo", async () => {
  const hash = await fingerprint(fields, file()); expect(hash).toHaveLength(64);
  expect(await fingerprint(fields, file())).toBe(hash);
  expect(await fingerprint({ ...fields, bankReference: "OTRA TEST" }, file())).not.toBe(hash);
  expect(await fingerprint(fields, new File(["different"], "test.png", { type: "image/png" }))).not.toBe(hash);
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  const intent = { key: id, holdId: id, fingerprint: hash, bankAccountId: id, rulesVersion: "TEST-1", uncertain: true };
  writeOrderIntent(storage, intent); expect(readOrderIntent(storage)).toEqual(intent);
  const serialized = store.get(orderIntentKey)!; expect(serialized).not.toContain(fields.customerEmail); expect(serialized).not.toContain(fields.bankReference); expect(serialized).not.toContain(code);
});
test("fecha expresa Santo Domingo y rechaza calendarios imposibles o sin hora", () => {
  expect(transferDate("2026-11-04T12:30")).toBe("2026-11-04T16:30:00.000Z");
  for (const value of ["2026-02-31T12:30", "2026-11-04", "invalid"]) expect(transferDate(value)).toBeNull();
});
test("comprobante obligatorio, no vacío, JPG/PNG/PDF y dentro del límite", () => {
  expect(validReceipt(file(), 5)).toBe(true); expect(validReceipt(file(), 2)).toBe(false); expect(validReceipt(null, 5)).toBe(false);
  expect(validReceipt(new File([], "empty.png", { type: "image/png" }), 5)).toBe(false);
  expect(validReceipt(new File(["svg"], "test.svg", { type: "image/svg+xml" }), 5)).toBe(false);
});
test("localizador HttpOnly no autoriza y rechaza CSRF y datos ajenos al código", async () => {
  vi.stubEnv("APP_ENV", "production");
  const request = (origin: string, body: unknown) => new NextRequest("https://web.example.test/api/order-locator", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  expect((await POST(request("https://other.example.test", { orderCode: code }))).status).toBe(403);
  expect((await POST(request("https://web.example.test", { orderCode: code, name: "PII" }))).status).toBe(400);
  const result = await POST(request("https://web.example.test", { orderCode: code }));
  expect(result.headers.get("Set-Cookie")).toContain("HttpOnly"); expect(result.headers.get("Set-Cookie")).toContain("Secure"); expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(await result.json()).toEqual({ saved: true });
});

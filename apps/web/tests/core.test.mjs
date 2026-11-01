import { test } from "node:test";
import assert from "node:assert/strict";
import { readEnvironment } from "../src/lib/config.ts";
import { formatMoney, formatDate } from "../src/lib/format.ts";
import { parseApiError, messageForCode } from "../src/lib/api/errors.ts";

test("mock solo se permite en desarrollo/test y se bloquea durante build de producción", () => {
  assert.equal(readEnvironment({ API_MODE: "mock", APP_ENV: "development" }).mode, "mock");
  assert.equal(readEnvironment({ API_MODE: "mock", APP_ENV: "test" }).mode, "mock");
  for (const appEnv of ["staging", "production"]) {
    assert.throws(() => readEnvironment({ API_MODE: "mock", APP_ENV: appEnv }));
  }
  assert.throws(() => readEnvironment({ API_MODE: "mock", APP_ENV: "development", NODE_ENV: "production" }));
});
test("shell sin API y rechazo de modo inválido, credenciales, query y transporte inseguro", () => {
  assert.equal(readEnvironment({}).apiBaseUrl, undefined);
  for (const env of [
    { API_MODE: "other" }, { API_MODE: "mock", APP_ENV: "other" },
    { API_BASE_URL: "https://user:secret@api.example.test/api/v1" },
    { API_BASE_URL: "https://api.example.test/api/v1?token=secret" },
    { API_BASE_URL: "https://api.example.test/api/v1#secret" },
    { API_BASE_URL: "https://api.example.test/other" },
    { API_BASE_URL: "http://api.example.test/api/v1", APP_ENV: "production" },
  ]) assert.throws(() => readEnvironment(env));
  assert.equal(readEnvironment({ API_BASE_URL: "https://api.example.test/api/v1/" }).apiBaseUrl, "https://api.example.test/api/v1");
});
test("dinero conserva centavos, incluso en el máximo entero seguro", () => {
  assert.equal(formatMoney(0), "RD$ 0.00");
  assert.equal(formatMoney(10001), "RD$ 100.01");
  assert.equal(formatMoney(1), "RD$ 0.01");
  assert.match(formatMoney(Number.MAX_SAFE_INTEGER), /\.91$/);
  for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => formatMoney(invalid));
});
test("fecha UTC se presenta en Santo Domingo", () => {
  assert.match(formatDate("2026-10-27T16:30:00Z"), /12:30/);
});
test("error conserva código y requestId seguro sin mostrar mensajes internos", () => {
  const error = parseApiError({ error: { code: "HOLD_EXPIRED", message: "internal secret", requestId: "req-123" } }, 409);
  assert.equal(error.code, "HOLD_EXPIRED");
  assert.equal(error.requestId, "req-123");
  assert.equal(error.status, 409);
  assert.match(error.message, /solicita asistencia/);
  assert.doesNotMatch(error.message, /internal secret/);
});
test("respuestas inesperadas y correlaciones inseguras tienen fallback neutro", () => {
  for (const body of [null, "html", {}, { error: null }, { error: { message: "secret" } }]) {
    assert.equal(parseApiError(body, 500).code, "UNKNOWN_ERROR");
  }
  assert.equal(parseApiError({ error: { code: "FAIL", requestId: "nombre@ejemplo.test" } }, 500).requestId, undefined);
  assert.doesNotMatch(messageForCode("STORAGE_UNAVAILABLE"), /No se creó la orden/);
});

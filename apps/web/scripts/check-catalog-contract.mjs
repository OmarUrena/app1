import { readFile } from "node:fs/promises";

// Checks the backend-owned export. It does not create DTOs, endpoints or fixtures.
const source = new URL("../../../docs/openapi.json", import.meta.url);
const required = ["/api/v1/raffles", "/api/v1/raffles/{slug}", "/api/v1/raffles/{slug}/availability", "/api/v1/bank-accounts/public"];
try {
  const schema = JSON.parse(await readFile(source, "utf8"));
  const missing = required.filter(path => !schema.paths?.[path]?.get?.responses?.["200"]?.content?.["application/json"]?.schema);
  const ready = missing.length === 0;
  console.log(JSON.stringify({ ready, source: "docs/openapi.json", missing, message: ready ? "Rutas GET presentes. Revisar DTOs y regenerar cliente antes de integrar." : "F2 requiere B2. Las rutas o respuestas públicas aún no están disponibles en el contrato generado." }, null, 2));
  process.exitCode = ready ? 0 : 2;
} catch {
  console.error("No se pudo validar docs/openapi.json. Genera el OpenAPI de NestJS antes de comprobar F2.");
  process.exitCode = 1;
}

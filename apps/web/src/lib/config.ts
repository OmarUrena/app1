type EnvironmentInput = Record<string, string | undefined>;

export function readEnvironment(env: EnvironmentInput) {
  const mode = env.API_MODE ?? "live";
  const appEnv = env.APP_ENV ?? (env.NODE_ENV === "development" ? "development" : "production");
  if (!["development", "test", "staging", "production"].includes(appEnv)) throw new Error("APP_ENV no válido.");
  if (mode !== "live" && mode !== "mock") throw new Error("API_MODE debe ser live o mock.");
  if (mode === "mock" && (env.NODE_ENV === "production" || !["development", "test"].includes(appEnv))) {
    throw new Error("El modo mock está prohibido en builds de producción y staging.");
  }
  const raw = env.API_BASE_URL;
  // F0 can build an offline shell without API configuration. No client is initialized here.
  let apiBaseUrl: string | undefined;
  if (raw) {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, "") !== "/api/v1") {
      throw new Error("API_BASE_URL debe ser un origen HTTP(S) con ruta /api/v1, sin credenciales.");
    }
    if (["staging", "production"].includes(appEnv) && url.protocol !== "https:") throw new Error("La API requiere HTTPS en staging/producción.");
    apiBaseUrl = url.toString().replace(/\/$/, "");
  }
  const receiptMaxBytes = Number(env.RECEIPT_MAX_BYTES ?? 5242880);
  if (!Number.isSafeInteger(receiptMaxBytes) || receiptMaxBytes < 1 || receiptMaxBytes > 10485760) throw new Error("RECEIPT_MAX_BYTES debe ser un entero entre 1 y 10485760, coherente con la API.");
  return { mode, appEnv, apiBaseUrl, receiptMaxBytes } as const;
}

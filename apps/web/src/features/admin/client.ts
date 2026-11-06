export class AdminClientError extends Error {
  constructor(public code: string, public status: number) { super(adminMessage(code)); }
}
// Full document navigation drops private client state/router caches on authentication changes.
export function navigateAdmin(path: string) { window.location.replace(new URL(path, window.location.origin).href); }
export function adminMessage(code: string) {
  const messages: Record<string, string> = {
    INVALID_CREDENTIALS: "No pudimos iniciar sesión con esos datos.", INVALID_MFA: "El código no es válido o venció. Introduce uno nuevo.",
    UNAUTHORIZED: "La sesión terminó. Vuelve a iniciar sesión.", SESSION_REVOKED: "La sesión fue revocada. Vuelve a iniciar sesión.",
    FORBIDDEN: "No tienes autorización para esta operación.", ADMIN_ACCESS_REVOKED: "El acceso administrativo fue retirado.",
    MFA_REQUIRED: "Confirma de nuevo tu código de autenticación para continuar.", RATE_LIMITED: "Demasiados intentos. Espera antes de volver a intentarlo.",
    AUTH_UNAVAILABLE: "El servicio de autenticación no está disponible. Inténtalo más tarde.",
    SERVICE_UNAVAILABLE: "La API administrativa no está disponible. Espera un momento y vuelve a intentarlo.",
    INTERNAL_ERROR: "No se pudo verificar el acceso administrativo. Vuelve a intentarlo; si persiste, informa al responsable.",
    NETWORK_ERROR: "No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.",
    CONCURRENT_MODIFICATION: "Otro administrador modificó la orden. Actualiza el detalle antes de tomar otra decisión.",
    IDEMPOTENCY_CONFLICT: "Este intento ya se procesó con otros datos. Actualiza el detalle.",
    AMOUNT_MISMATCH: "El importe verificado debe coincidir exactamente con el total de la orden.",
    DUPLICATE_REVIEW_REQUIRED: "Revisa y confirma las señales de duplicación antes de aprobar.",
    RECONCILIATION_REQUIRED: "La cancelación requiere conciliación y evidencia completas.",
    INVALID_ORDER_STATE: "La orden ya no permite esta acción. Actualiza el detalle.",
    INVALID_REQUEST: "Revisa los campos y las confirmaciones obligatorias.", INVALID_DATE_RANGE: "El inicio debe ser anterior al final del intervalo.",
    STORAGE_UNAVAILABLE: "No se puede consultar el comprobante en este momento.", NOT_FOUND: "No encontramos la orden o el recurso solicitado.",
    FACTOR_EXISTS: "Ya tienes una aplicación autenticadora registrada. Recarga la página.",
  };
  return messages[code] ?? "No pudimos completar la operación. Conserva el intento y vuelve a intentarlo.";
}
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(20000) }); }
  catch { throw new AdminClientError("NETWORK_ERROR", 0); }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body?.error?.code ?? "SERVICE_UNAVAILABLE";
    if (path.startsWith("/admin/api/") && [401, 403].includes(response.status)) {
      navigateAdmin(code === "MFA_REQUIRED" ? "/admin/mfa" : "/admin/login");
    }
    throw new AdminClientError(code, response.status);
  }
  return body as T;
}
export const authPost = <T,>(action: string, body?: object) => adminFetch<T>(`/admin/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

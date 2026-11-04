export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId?: string;
  constructor(code: string, status: number, requestId?: string) {
    super(messageForCode(code));
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

const messages: Record<string, string> = {
  SESSION_INVALID: "No pudimos acceder a tu sesión. No crees otra reserva si ya transferiste; solicita asistencia.",
  RAFFLE_NOT_AVAILABLE: "Esta rifa no admite nuevas pre-reservas en este momento.",
  INVALID_QUANTITY: "La cantidad no cumple los límites de esta rifa. Revisa la cantidad.",
  HOLD_CONSUMED: "Este cupo ya se utilizó. No crees otra reserva; solicita asistencia para consultar tu orden.",
  INSUFFICIENT_TICKETS: "Ya no quedan tantos boletos disponibles. Reduce la cantidad.",
  HOLD_EXPIRED: "La reserva temporal venció. Si ya transferiste, solicita asistencia.",
  IDEMPOTENCY_CONFLICT: "Esta solicitud ya fue procesada con otros datos. Consulta tu orden.",
  UNSUPPORTED_FILE_TYPE: "Adjunta JPG, PNG o PDF.",
  FILE_TOO_LARGE: "El comprobante supera el tamaño permitido.",
  RATE_LIMITED: "Demasiadas solicitudes; inténtalo más tarde.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  STORAGE_UNAVAILABLE: "No pudimos confirmar la recepción del comprobante. Solicita asistencia antes de volver a enviar.",
  NETWORK_ERROR: "No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.",
};
export function messageForCode(code: string): string {
  return messages[code] ?? "No pudimos completar la solicitud. Inténtalo más tarde.";
}
function safeRequestId(value: unknown): string | undefined {
  return typeof value === "string" && /^[\w.-]{1,128}$/.test(value) ? value : undefined;
}
export function parseApiError(body: unknown, status: number, headerRequestId?: string | null): ApiError {
  const fallbackCode = status === 429 ? "RATE_LIMITED" : status === 403 ? "FORBIDDEN" : "UNKNOWN_ERROR";
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (typeof error === "object" && error !== null) {
      const code = "code" in error && typeof error.code === "string" ? error.code : fallbackCode;
      const requestId = safeRequestId("requestId" in error ? error.requestId : undefined) ?? safeRequestId(headerRequestId);
      return new ApiError(code, status, requestId);
    }
  }
  return new ApiError(fallbackCode, status, safeRequestId(headerRequestId));
}

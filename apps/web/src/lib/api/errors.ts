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
export function parseApiError(body: unknown, status: number): ApiError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (typeof error === "object" && error !== null) {
      const code = "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN_ERROR";
      const requestId = "requestId" in error && typeof error.requestId === "string" && /^[\w.-]{1,128}$/.test(error.requestId) ? error.requestId : undefined;
      return new ApiError(code, status, requestId);
    }
  }
  return new ApiError("UNKNOWN_ERROR", status);
}

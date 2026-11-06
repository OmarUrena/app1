// Only fixed diagnostics: arbitrary exception messages may contain credentials or PII.
export function startupFailure(error: unknown, port?: number) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const diagnostics = {
    EADDRINUSE: 'Puerto ocupado. Deten la otra instancia de la API antes de volver a iniciar.',
    EACCES: 'Sin permiso para escuchar en el puerto configurado.',
    EADDRNOTAVAIL: 'La direccion HOST configurada no esta disponible en este equipo.',
  } as const;
  const known = typeof code === 'string' && Object.hasOwn(diagnostics, code)
    ? code as keyof typeof diagnostics : undefined;
  return {
    level: 'error', event: 'startup_failed', code: known ?? 'STARTUP_FAILED',
    message: known ? diagnostics[known] : 'No se pudo iniciar la API. Revisa la configuracion del servidor.',
    ...(Number.isSafeInteger(port) && port! > 0 && port! <= 65535 ? { port } : {}),
  };
}

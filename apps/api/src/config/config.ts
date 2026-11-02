export interface AppConfig {
  environment: 'development' | 'test' | 'staging' | 'production';
  host: string;
  port: number;
  corsOrigins: string[];
  swaggerEnabled: boolean;
  logLevel: 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  rateLimit: number;
  rateTtlMs: number;
  databaseUrl?: string;
  databaseSsl: boolean;
  databaseCa?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  publicMediaBucket: string;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

function integer(value: string | undefined, fallback: number, name: string, max: number): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`Configuración inválida: ${name}`);
  }
  return parsed;
}

function boolean(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined) return fallback;
  if (value !== 'true' && value !== 'false') throw new Error(`Configuración inválida: ${name}`);
  return value === 'true';
}

export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const environment = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'staging', 'production'].includes(environment)) {
    throw new Error('Configuración inválida: NODE_ENV');
  }
  const deployed = environment === 'production' || environment === 'staging';
  const corsOrigins = (env.CORS_ORIGINS ?? (deployed ? '' : 'http://localhost:3000'))
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  if (corsOrigins.length === 0 || corsOrigins.some((origin) => {
    try {
      const url = new URL(origin);
      return url.origin !== origin || !['http:', 'https:'].includes(url.protocol)
        || (deployed && url.protocol !== 'https:');
    } catch { return true; }
  })) throw new Error('Configuración inválida: CORS_ORIGINS');
  const swaggerEnabled = boolean(env.SWAGGER_ENABLED, !deployed, 'SWAGGER_ENABLED');
  if (deployed && swaggerEnabled) throw new Error('Swagger público prohibido en staging/production');
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (!['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(logLevel)) {
    throw new Error('Configuración inválida: LOG_LEVEL');
  }
  const databaseSsl = boolean(env.DATABASE_SSL, true, 'DATABASE_SSL');
  const databaseUrl = env.DATABASE_URL || undefined;
  if (deployed && (!databaseUrl || !databaseSsl)) throw new Error('DB con TLS requerida');
  if (databaseUrl) {
    let url: URL;
    try { url = new URL(databaseUrl); } catch { throw new Error('Configuración inválida: DATABASE_URL'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || [...url.searchParams.keys()].some((key) => key.startsWith('ssl'))) {
      throw new Error('DATABASE_URL inválida: configurar TLS mediante DATABASE_SSL/DATABASE_CA');
    }
  }
  const supabaseUrl = env.SUPABASE_URL || undefined;
  if (supabaseUrl) {
    let url: URL;
    try { url = new URL(supabaseUrl); } catch { throw new Error('Configuración inválida: SUPABASE_URL'); }
    const local = !deployed && ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
    if (url.origin !== supabaseUrl || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
      throw new Error('SUPABASE_URL debe ser un origen HTTPS (loopback HTTP solo en desarrollo/test)');
    }
  }
  const publicMediaBucket = env.PUBLIC_RAFFLE_BUCKET ?? 'raffle-media';
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(publicMediaBucket)) throw new Error('PUBLIC_RAFFLE_BUCKET inválido');
  const supabasePublishableKey=env.SUPABASE_PUBLISHABLE_KEY||undefined;
  if (supabasePublishableKey && (!/^[a-zA-Z0-9_.-]{8,4096}$/.test(supabasePublishableKey)
    || supabasePublishableKey.startsWith('sb_secret_'))) throw new Error('SUPABASE_PUBLISHABLE_KEY inválida');
  return {
    environment: environment as AppConfig['environment'],
    host: env.HOST ?? '127.0.0.1',
    port: integer(env.PORT, 3001, 'PORT', 65535),
    corsOrigins, swaggerEnabled,
    logLevel: logLevel as AppConfig['logLevel'],
    rateLimit: integer(env.RATE_LIMIT, 120, 'RATE_LIMIT', 10000),
    rateTtlMs: integer(env.RATE_TTL_MS, 60000, 'RATE_TTL_MS', 3600000),
    databaseUrl, databaseSsl, databaseCa: env.DATABASE_CA?.replace(/\\n/g, '\n'),
    supabaseUrl, supabasePublishableKey, publicMediaBucket,
  };
}


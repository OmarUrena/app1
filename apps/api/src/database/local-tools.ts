import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export const workspaceRoot = resolve(__dirname, '../../../..');

// Estos comandos de mantenimiento se limitan deliberadamente a bases locales.
export function localDatabaseUrl(value: string | undefined): URL {
  if (!value) throw new Error('Configurar TEST_DATABASE_URL o DATABASE_URL local');
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.search || url.hash) {
    throw new Error('Herramienta limitada a PostgreSQL loopback; no se ejecuta en bases remotas');
  }
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    throw new Error('Herramienta local prohibida en staging/production');
  }
  return url;
}

export function demoDatabaseUrl(value: string | undefined): URL {
  const url = localDatabaseUrl(value);
  if (!/^\/sorteos_(dev|test|b1_test_[a-z0-9_]+)$/.test(url.pathname)) {
    throw new Error('Las escrituras locales requieren una DB sorteos_dev, sorteos_test o sorteos_b1_test_*');
  }
  return url;
}

export function migrateLocal(databaseUrl: string): string {
  return runLocalCli(databaseUrl,['db','push','--skip-vault']);
}

export function revertLocalMigrationHistory(databaseUrl:string,version:string):string {
  if (!/^\d{14}$/.test(version)) throw new Error('Versión de migración inválida');
  return runLocalCli(databaseUrl,['migration','repair',version,'--status','reverted']);
}

function runLocalCli(databaseUrl:string,command:string[]):string {
  const url = demoDatabaseUrl(databaseUrl);
  // El cluster desechable loopback no tiene TLS; nunca se aplica a conexiones remotas.
  url.searchParams.set('sslmode', 'disable');
  // Un único sistema/historial de migraciones: CLI oficial de Supabase.
  try {
    return execFileSync(process.execPath, [resolve(workspaceRoot, 'node_modules/supabase/dist/supabase.js'),
      '--workdir', resolve(workspaceRoot, 'infra'), ...command, '--db-url', url.toString(),'--yes'], {
      cwd: workspaceRoot, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error: unknown) {
    // Los errores de execFile incluyen argumentos: no propagar una URL con contraseña.
    let diagnostic = typeof error === 'object' && error !== null && 'stderr' in error
      ? String(error.stderr) : '';
    if (typeof error === 'object' && error !== null && 'stdout' in error) {
      diagnostic += '\n' + String(error.stdout);
    }
    diagnostic = diagnostic.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[DB_URL]');
    for (const secret of [url.password, decodeURIComponent(url.password)]) {
      if (secret) diagnostic = diagnostic.split(secret).join('[REDACTED]');
    }
    diagnostic = diagnostic.split(/\r?\n/).map(line => line.slice(0,1000)).slice(-12).join('\n');
    throw new Error(`Supabase CLI no pudo aplicar migraciones locales.\n${diagnostic}`);
  }
}

import { loadConfig } from '../config/load-config';
import { localDatabaseUrl, migrateLocal } from './local-tools';

try {
  const config = loadConfig();
  const url = localDatabaseUrl(config.databaseUrl);
  migrateLocal(url.toString());
  process.stdout.write('Migraciones locales aplicadas por Supabase CLI.\n');
} catch {
  process.stderr.write('No se pudieron aplicar migraciones locales. Verificar entorno, CLI y PostgreSQL local.\n');
  process.exitCode = 1;
}

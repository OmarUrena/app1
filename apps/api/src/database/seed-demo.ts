import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { loadConfig } from '../config/load-config';
import { demoDatabaseUrl, workspaceRoot } from './local-tools';

export async function seedDemo(client: Client): Promise<void> {
  const sql = await readFile(resolve(workspaceRoot, 'infra/seeds/demo.sql'), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(111001, 1)");
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (process.env.SEED_DEMO !== 'true') throw new Error('Requiere SEED_DEMO=true');
  const url = demoDatabaseUrl(config.databaseUrl);
  const client = new Client({ connectionString: url.toString(),
    ssl: config.databaseSsl ? { rejectUnauthorized: true, ca: config.databaseCa } : false });
  try {
    await client.connect();
    await seedDemo(client);
    process.stdout.write('Seed DEMO local aplicado. No hay ventas ni archivos bancarios reales.\n');
  } finally { await client.end(); }
}
if (require.main === module) void main().catch(() => {
  process.stderr.write('Seed DEMO no aplicado: comprobar entorno local, migraciones y SEED_DEMO.\n');
  process.exitCode = 1;
});

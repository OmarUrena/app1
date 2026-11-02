import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import { Client } from 'pg';
import { loadConfig } from '../config/load-config';
import { demoDatabaseUrl } from '../database/local-tools';

// Herramienta explícita del operador, sin endpoint ni promoción al registrarse.
async function main():Promise<void> {
  const config=loadConfig();
  const subject=process.env.LOCAL_ADMIN_USER_ID;
  const role=process.env.LOCAL_ADMIN_ROLE ?? 'OWNER';
  if (process.env.PROVISION_LOCAL_ADMIN!=='true' || !subject || !isUUID(subject)
    || !['OWNER','ADMIN'].includes(role) || !config.supabaseUrl) throw new Error('Configuración requerida');
  const url=demoDatabaseUrl(config.databaseUrl);
  const client=new Client({connectionString:url.toString(),ssl:config.databaseSsl?{rejectUnauthorized:true,ca:config.databaseCa}:false});
  try {
    await client.connect();
    await client.query('BEGIN');
    try {
      await client.query('SELECT pg_advisory_xact_lock(111002,1)');
      await client.query("SELECT set_config('app.actor_kind','SYSTEM',true),set_config('app.request_id',$1,true)",[randomUUID()]);
      const existing=await client.query<{role:string;active:boolean}>('SELECT role,active FROM sorteos.admin_users WHERE auth_user_id=$1',[subject]);
      if (existing.rows[0] && (existing.rows[0].role!==role || !existing.rows[0].active)) {
        throw new Error('No modificar autorizaciones existentes con esta herramienta');
      }
      if (!existing.rowCount) await client.query('INSERT INTO sorteos.admin_users(auth_user_id,role,active) VALUES ($1,$2,true)',[subject,role]);
      await client.query('COMMIT');
      process.stdout.write('Allowlist local preparada para el UUID Auth indicado; se requiere JWT válido del proyecto.\n');
    } catch (error) { await client.query('ROLLBACK');throw error; }
  } finally { await client.end(); }
}
void main().catch(()=>{
  process.stderr.write('No se provisionó el administrador: verificar opt-in, UUID Auth, proyecto, DB local y propietario existente.\n');
  process.exitCode=1;
});

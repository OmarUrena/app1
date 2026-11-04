import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { revertLocalMigrationHistory, workspaceRoot } from '../src/database/local-tools';

export async function revertEmptyB4(client:Client,url:string) {
  await revertEmptyB5(client,url);
  const history=await client.query<{version:string}>("SELECT version FROM supabase_migrations.schema_migrations WHERE name='order_receipts_b4'");
  if(!history.rows[0])return;
  await client.query('BEGIN');
  try {
    await client.query(await readFile(resolve(workspaceRoot,'infra/recovery/b4-down-empty.sql'),'utf8'));
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
  revertLocalMigrationHistory(url,history.rows[0].version);
}

export async function revertEmptyB5(client:Client,url:string) {
  const history=await client.query<{version:string}>("SELECT version FROM supabase_migrations.schema_migrations WHERE name='admin_payments_b5'");
  if(!history.rows[0])return;
  await client.query('BEGIN');
  try{
    await client.query(await readFile(resolve(workspaceRoot,'infra/recovery/b5-down-empty.sql'),'utf8'));
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
  revertLocalMigrationHistory(url,history.rows[0].version);
}

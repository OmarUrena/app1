import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { APP_CONFIG, AppConfig } from '../config/config';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool?: Pool;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (config.databaseUrl) {
      this.pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.databaseSsl ? { rejectUnauthorized: true, ca: config.databaseCa } : false,
        max: 5, connectionTimeoutMillis: 2000, idleTimeoutMillis: 10000,
        statement_timeout: 2000, query_timeout: 2500,
      });
      this.pool.on('error', () => { /* Readiness informa caída sin registrar URL ni credenciales. */ });
    }
  }

  async check(): Promise<'up' | 'unconfigured' | 'down'> {
    if (!this.pool) return 'unconfigured';
    try { await this.pool.query('SELECT 1'); return 'up'; } catch { return 'down'; }
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>, readOnly = false, consistent = false): Promise<T> {
    if (!this.pool) throw new ServiceUnavailableException({ code:'DATABASE_NOT_CONFIGURED' });
    let client: PoolClient;
    try { client = await this.pool.connect(); }
    catch { throw new ServiceUnavailableException({ code:'DATABASE_UNAVAILABLE' }); }
    try {
      await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : consistent?'BEGIN ISOLATION LEVEL REPEATABLE READ':'BEGIN');
      await client.query('SET LOCAL ROLE sorteos_runtime');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async onModuleDestroy(): Promise<void> { await this.pool?.end(); }
}

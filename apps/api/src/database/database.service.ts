import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
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

  async onModuleDestroy(): Promise<void> { await this.pool?.end(); }
}

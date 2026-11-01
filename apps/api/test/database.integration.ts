import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/bootstrap';
import { parseConfig } from '../src/config/config';

test('readiness consulta PostgreSQL real aislado', async () => {
  // Fallar explícitamente si falta infraestructura; no convertir omisiones en PASS.
  assert.ok(process.env.TEST_DATABASE_URL, 'Configurar TEST_DATABASE_URL para PostgreSQL aislado');
  const config = parseConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', SWAGGER_ENABLED: 'false',
    DATABASE_URL: process.env.TEST_DATABASE_URL, DATABASE_SSL: process.env.TEST_DATABASE_SSL ?? 'false' });
  const app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  try {
    const response = await fetch(`${await app.getUrl()}/api/v1/health/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ready', database: 'up' });
  } finally { await app.close(); }
});

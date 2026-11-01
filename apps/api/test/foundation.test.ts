import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Controller, Get, INestApplication, Module, Post, Body } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, Min } from 'class-validator';
import { createApp, configureApp } from '../src/bootstrap';
import { parseConfig } from '../src/config/config';
import { SafeLogger } from '../src/common/logger';
import { createDocument } from '../src/openapi';

const config = parseConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', SWAGGER_ENABLED: 'true' });
let app: INestApplication;
let base: string;

before(async () => {
  app = await createApp(config);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app?.close(); });

test('liveness real, cabeceras de seguridad y correlación', async () => {
  const response = await fetch(`${base}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-request-id')!, /^[0-9a-f-]{36}$/);
});

test('sin DB, readiness falla explícitamente y liveness permanece disponible', async () => {
  const response = await fetch(`${base}/api/v1/health/ready`);
  assert.equal(response.status, 503);
  const body = await response.json() as { error: { code: string; requestId: string } };
  assert.equal(body.error.code, 'DATABASE_NOT_CONFIGURED');
  assert.equal(body.error.requestId, response.headers.get('x-request-id'));
});

test('CORS permite solo orígenes configurados', async () => {
  const allowed = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  const denied = await fetch(`${base}/api/v1/health`, { headers: { Origin: 'https://untrusted.invalid' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('404 uniforme no reproduce URL, tokens ni PII', async () => {
  const response = await fetch(`${base}/api/v1/missing?token=SECRETO_DE_PRUEBA`);
  assert.equal(response.status, 404);
  assert.ok(!(await response.text()).includes('SECRETO_DE_PRUEBA'));
});

test('OpenAPI se deriva de los controladores y no inventa rutas de negocio', async () => {
  const document = createDocument(app);
  assert.deepEqual(Object.keys(document.paths).sort(), ['/api/v1/health', '/api/v1/health/ready']);
  assert.ok(document.components?.schemas?.ErrorResponseDto);
  assert.equal((await fetch(`${base}/api/v1/openapi.json`)).status, 200);
});

test('configuración rechaza orígenes comodín, números inválidos y TLS inseguro', () => {
  for (const env of [
    { CORS_ORIGINS: '*' }, { PORT: '0' }, { PORT: 'abc' }, { SWAGGER_ENABLED: 'yes' },
    { DATABASE_URL: 'postgres://localhost/demo?sslmode=no-verify' },
    { NODE_ENV: 'production', CORS_ORIGINS: 'https://example.invalid', SWAGGER_ENABLED: 'true' },
    { NODE_ENV: 'production', CORS_ORIGINS: 'https://example.invalid', DATABASE_SSL: 'false' },
  ]) assert.throws(() => parseConfig(env));
});

class InputDto {
  @IsInt() @Min(1) quantity!: number;
}

// Controlador exclusivo de pruebas: valida infraestructura sin añadir endpoints de producto.
@Controller('probe')
class ProbeController {
  @Post() echo(@Body() body: InputDto) { return body; }
  @Get('failure') failure(): never { throw new Error('SECRETO_DE_PRUEBA'); }
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

test('validación, JSON corrupto y errores internos usan el mismo envelope', async () => {
  const module = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
  const probe = module.createNestApplication({ logger: false, bodyParser: false });
  configureApp(probe, { ...config, swaggerEnabled: false }, new SafeLogger('silent'));
  await probe.listen(0, '127.0.0.1');
  try {
    const origin = await probe.getUrl();
    for (const body of [JSON.stringify({ quantity: 0 }), JSON.stringify({ quantity: 2, secret: 'SECRET' }), '{']) {
      const response = await fetch(`${origin}/api/v1/probe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
      });
      assert.equal(response.status, 400);
      const payload = await response.json() as { error: { code: string; details: object } };
      assert.equal(payload.error.code, 'INVALID_REQUEST');
      assert.deepEqual(payload.error.details, {});
    }
    const success = await fetch(`${origin}/api/v1/probe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"quantity":2}',
    });
    assert.equal(success.status, 201);
    const failure = await fetch(`${origin}/api/v1/probe/failure`);
    assert.equal(failure.status, 500);
    assert.ok(!(await failure.text()).includes('SECRETO_DE_PRUEBA'));
  } finally { await probe.close(); }
});

test('rate limiting devuelve 429 uniforme', async () => {
  const limited = await createApp({ ...config, swaggerEnabled: false, rateLimit: 1 });
  await limited.listen(0, '127.0.0.1');
  try {
    const url = `${await limited.getUrl()}/api/v1/health`;
    assert.equal((await fetch(url)).status, 200);
    const response = await fetch(url);
    assert.equal(response.status, 429);
    const body = await response.json() as { error: { code: string } };
    assert.equal(body.error.code, 'RATE_LIMITED');
  } finally { await limited.close(); }
});

test('Swagger deshabilitado no expone UI ni JSON', async () => {
  const hidden = await createApp({ ...config, swaggerEnabled: false });
  await hidden.listen(0, '127.0.0.1');
  try {
    for (const path of ['docs', 'openapi.json']) {
      assert.equal((await fetch(`${await hidden.getUrl()}/api/v1/${path}`)).status, 404);
    }
  } finally { await hidden.close(); }
});

test('DB inaccesible produce 503 sin filtrar cadena de conexión', async () => {
  const disconnected = await createApp({ ...config, swaggerEnabled: false,
    databaseUrl: 'postgres://demo:SECRET@127.0.0.1:1/demo', databaseSsl: false });
  await disconnected.listen(0, '127.0.0.1');
  try {
    const response = await fetch(`${await disconnected.getUrl()}/api/v1/health/ready`);
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.ok(text.includes('DATABASE_UNAVAILABLE'));
    assert.ok(!text.includes('SECRET'));
  } finally { await disconnected.close(); }
});

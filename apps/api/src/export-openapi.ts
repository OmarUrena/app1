import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from './bootstrap';
import { parseConfig } from './config/config';
import { createDocument } from './openapi';

async function main(): Promise<void> {
  // Exportación sin secretos, DB ni configuración del entorno desplegado.
  const app = await createApp(parseConfig({ NODE_ENV: 'test', SWAGGER_ENABLED: 'false', LOG_LEVEL: 'silent' }));
  try {
    await app.init();
    const output = resolve(__dirname, '../../..', 'docs/openapi.json');
    await mkdir(resolve(output, '..'), { recursive: true });
    await writeFile(output, JSON.stringify(createDocument(app), null, 2) + '\n');
  } finally { await app.close(); }
}
void main();

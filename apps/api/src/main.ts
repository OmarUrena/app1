import { createApp } from './bootstrap';
import { loadConfig } from './config/load-config';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);
  await app.listen(config.port, config.host);
}

void main().catch(() => {
  process.stderr.write('{"level":"error","event":"startup_failed"}\n');
  process.exitCode = 1;
});

import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { AppConfig, parseConfig } from './config';

export function loadConfig(): AppConfig {
  loadDotenv({ path: [resolve(process.cwd(), '.env'), resolve(__dirname, '../../.env')], quiet: true });
  return parseConfig(process.env);
}

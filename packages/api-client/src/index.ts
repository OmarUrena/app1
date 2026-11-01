import createClient from 'openapi-fetch';
import type { paths } from './generated';

export type { paths, components, operations } from './generated';

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl, credentials: 'include' });
}

import createClient from 'openapi-fetch';
import type { paths } from './generated';

export type { paths, components, operations } from './generated';

export function createApiClient(baseUrl: string, accessToken?: string) {
  return createClient<paths>({ baseUrl, credentials: 'include',
    headers: accessToken ? {Authorization:`Bearer ${accessToken}`} : undefined });
}

type OrderMultipart=paths['/api/v1/orders']['post']['requestBody']['content']['multipart/form-data'];
export type OrderSubmission=Omit<OrderMultipart,'receipt'> & {receipt:Blob};

/** Mantiene el contrato tipado y deja al navegador generar el boundary multipart. */
export function submitOrder(client:ReturnType<typeof createApiClient>,data:OrderSubmission,idempotencyKey:string,origin:string) {
  const form=new FormData();
  for(const [key,value] of Object.entries(data))if(value!==undefined)form.append(key,value);
  return client.POST('/api/v1/orders',{
    params:{header:{Origin:origin,'Idempotency-Key':idempotencyKey}},
    // OpenAPI representa binary como string; el wire body real es FormData con Blob.
    body:form as unknown as OrderMultipart,bodySerializer:()=>form,
  });
}

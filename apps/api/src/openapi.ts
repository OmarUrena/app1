import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('App Sorteos API').setDescription('B2: catálogo y gestión de rifas con JWT de Supabase y allowlist activa.')
    .addBearerAuth().setVersion('0.2.0').build(), {
    operationIdFactory: (controller, method) => `${controller}_${method}`,
  });
  for (const path of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = path[method];
      if (!operation) continue;
      for (const status of ['400', '401', '403', '404', '409', '422', '429', '500', '503']) {
        operation.responses[status] ??= { description: 'Error uniforme', content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponseDto' } },
        } };
      }
    }
  }
  return document;
}

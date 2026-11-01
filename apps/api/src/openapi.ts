import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('App Sorteos API').setDescription('B0: salud del servicio. Contrato de negocio pendiente B1–B6.')
    .setVersion('0.1.0').build(), {
    operationIdFactory: (controller, method) => `${controller}_${method}`,
  });
  for (const path of Object.values(document.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = path[method];
      if (!operation) continue;
      for (const status of ['400', '403', '404', '429', '500']) {
        operation.responses[status] ??= { description: 'Error uniforme', content: {
          'application/json': { schema: { $ref: '#/components/schemas/ErrorResponseDto' } },
        } };
      }
    }
  }
  return document;
}

import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/config';
import { ApiExceptionFilter, validationPipe } from './common/errors';
import { SafeLogger } from './common/logger';
import { createDocument } from './openapi';

export function configureApp(app: INestApplication, config: AppConfig, logger: SafeLogger): void {
  app.setGlobalPrefix('api/v1');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const start = performance.now();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.on('finish', () => logger.output.info({
      event: 'http_request', requestId, method: req.method,
      status: res.statusCode, durationMs: Math.round(performance.now() - start),
    }));
    next();
  });
  app.use(helmet());
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException(), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'], maxAge: 600,
  });
  app.use(json({ limit: '64kb' }));
  app.use(urlencoded({ extended: false, limit: '64kb' }));
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
  if (config.swaggerEnabled) SwaggerModule.setup('api/v1/docs', app, createDocument(app), {
    jsonDocumentUrl: 'api/v1/openapi.json',
    swaggerOptions: { persistAuthorization: false },
  });
}

export async function createApp(config: AppConfig): Promise<INestApplication> {
  const logger = new SafeLogger(config.logLevel);
  const app = await NestFactory.create(AppModule.register(config), { logger, bodyParser: false });
  configureApp(app, config, logger);
  app.enableShutdownHooks();
  return app;
}

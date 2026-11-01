import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_CONFIG, AppConfig } from './config/config';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ThrottlerModule.forRoot([{ ttl: config.rateTtlMs, limit: config.rateLimit }])],
      controllers: [HealthController],
      providers: [
        { provide: APP_CONFIG, useValue: config }, DatabaseService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    };
  }
}

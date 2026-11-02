import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_CONFIG, AppConfig } from './config/config';
import { DatabaseService } from './database/database.service';
import { HealthController } from './health/health.controller';
import { AdminGuard } from './auth/admin.guard';
import { CatalogService } from './catalog/catalog.service';
import { MediaService } from './catalog/media.service';
import { AdminRafflesController, PublicBankAccountsController, PublicRafflesController } from './catalog/catalog.controller';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ThrottlerModule.forRoot([{ ttl: config.rateTtlMs, limit: config.rateLimit }])],
      controllers: [HealthController,PublicRafflesController,PublicBankAccountsController,AdminRafflesController],
      providers: [
        { provide: APP_CONFIG, useValue: config }, DatabaseService,AdminGuard,CatalogService,MediaService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    };
  }
}

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { ErrorResponseDto } from '../common/errors';

export class HealthDto {
  @ApiProperty({ enum: ['ok'] }) status = 'ok' as const;
}

export class ReadyDto {
  @ApiProperty({ enum: ['ready'] }) status = 'ready' as const;
  @ApiProperty({ enum: ['up'] }) database = 'up' as const;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ApiOkResponse({ type: HealthDto, description: 'Proceso activo; no garantiza conexión a DB.' })
  health(): HealthDto { return new HealthDto(); }

  @Get('ready')
  @ApiOkResponse({ type: ReadyDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  async ready(): Promise<ReadyDto> {
    const state = await this.database.check();
    if (state !== 'up') throw new ServiceUnavailableException({
      code: state === 'unconfigured' ? 'DATABASE_NOT_CONFIGURED' : 'DATABASE_UNAVAILABLE',
    });
    return new ReadyDto();
  }
}

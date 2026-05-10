import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { HealthService, type HealthResponse, type LivenessResponse } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Returns API and database health status.' })
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOkResponse({ description: 'Returns process liveness without touching downstream services.' })
  live(): LivenessResponse {
    return this.healthService.liveness();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Returns readiness including database connectivity.' })
  ready(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}

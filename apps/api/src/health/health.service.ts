import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'mediguard-api';
  timestamp: string;
  database: {
    status: 'ok' | 'error';
  };
}

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    let databaseStatus: HealthResponse['database']['status'] = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = 'error';
    }

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      service: 'mediguard-api',
      timestamp: new Date().toISOString(),
      database: {
        status: databaseStatus,
      },
    };
  }
}

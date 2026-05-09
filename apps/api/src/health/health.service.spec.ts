import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when the database query succeeds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new HealthService(prisma as never);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      service: 'mediguard-api',
      database: { status: 'ok' },
    });
  });

  it('returns degraded when the database query fails', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection failed')),
    };
    const service = new HealthService(prisma as never);

    await expect(service.check()).resolves.toMatchObject({
      status: 'degraded',
      database: { status: 'error' },
    });
  });
});

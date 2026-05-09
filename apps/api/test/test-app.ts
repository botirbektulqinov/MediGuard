import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.setTimeout(30_000);

export async function createIntegrationTestApp(): Promise<INestApplication> {
  setIntegrationTestEnv();

  const { AppModule } = await import('../src/app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return app;
}

function setIntegrationTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL ??=
    'postgresql://mediguard:mediguard_dev_password@localhost:5432/mediguard?schema=public';
  process.env.JWT_ACCESS_SECRET ??= 'replace-with-a-long-random-development-secret';
  process.env.JWT_REFRESH_SECRET ??= 'replace-with-a-different-long-random-development-secret';
  process.env.CORS_ORIGIN ??= 'http://localhost:3000';
  process.env.SWAGGER_ENABLED ??= 'false';
}

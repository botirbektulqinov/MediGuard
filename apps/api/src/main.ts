import { ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';

function parseCorsOrigins(value: string): string | string[] {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0]! : origins;
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function parseBasicAuth(value: string | undefined): { username: string; password: string } | null {
  if (!value?.startsWith('Basic ')) {
    return null;
  }

  const decoded = Buffer.from(value.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function protectSwagger(
  app: NestExpressApplication,
  configService: ConfigService<Env, true>,
): void {
  const username = configService.get('SWAGGER_USERNAME', { infer: true });
  const password = configService.get('SWAGGER_PASSWORD', { infer: true });

  if (!username || !password) {
    return;
  }

  app.use('/api/docs', (request: Request, response: Response, next: NextFunction) => {
    const credentials = parseBasicAuth(request.headers.authorization);
    const isAllowed =
      credentials !== null &&
      secureCompare(credentials.username, username) &&
      secureCompare(credentials.password, password);

    if (isAllowed) {
      next();
      return;
    }

    response.setHeader('WWW-Authenticate', 'Basic realm="MediGuard API Docs"');
    response.status(401).send('Authentication required');
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<Env, true>);
  const logger = new Logger('HTTP');

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && /^[a-zA-Z0-9_.:-]{8,128}$/.test(requestIdHeader)
        ? requestIdHeader
        : randomUUID();
    const startedAt = Date.now();

    response.setHeader('X-Request-Id', requestId);
    response.on('finish', () => {
      logger.log(
        `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms requestId=${requestId}`,
      );
    });

    next();
  });
  app.enableCors({
    origin: parseCorsOrigins(configService.get('CORS_ORIGIN', { infer: true })),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (configService.get('SWAGGER_ENABLED', { infer: true })) {
    protectSwagger(app, configService);
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MediGuard API')
      .setDescription('Secure clinic operations API for MediGuard.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('API_PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();

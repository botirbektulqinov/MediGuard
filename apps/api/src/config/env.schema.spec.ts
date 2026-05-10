import { envValidationSchema } from './env.schema';

const baseProductionEnv = {
  NODE_ENV: 'production',
  API_PORT: 4000,
  DATABASE_URL: 'postgresql://mediguard:password@localhost:5432/mediguard?schema=public',
  JWT_ACCESS_SECRET: 'production-access-secret-at-least-32-chars',
  JWT_REFRESH_SECRET: 'production-refresh-secret-at-least-32-chars',
  CORS_ORIGIN: 'https://app.example.com',
  FILE_STORAGE_DIR: 'storage/uploads',
};

describe('envValidationSchema', () => {
  it('allows production with Swagger disabled and no Swagger credentials', () => {
    const { error } = envValidationSchema.validate({
      ...baseProductionEnv,
      SWAGGER_ENABLED: false,
    });

    expect(error).toBeUndefined();
  });

  it('requires Swagger credentials when Swagger is enabled in production', () => {
    const { error } = envValidationSchema.validate({
      ...baseProductionEnv,
      SWAGGER_ENABLED: true,
    });

    expect(error).toBeDefined();
  });

  it('allows protected Swagger when production credentials are configured', () => {
    const { error } = envValidationSchema.validate({
      ...baseProductionEnv,
      SWAGGER_ENABLED: true,
      SWAGGER_USERNAME: 'operator',
      SWAGGER_PASSWORD: 'long-random-docs-password',
    });

    expect(error).toBeUndefined();
  });
});

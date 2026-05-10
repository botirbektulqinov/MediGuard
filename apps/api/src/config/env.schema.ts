import * as Joi from 'joi';

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  API_PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
  SWAGGER_ENABLED: boolean;
  SWAGGER_USERNAME?: string;
  SWAGGER_PASSWORD?: string;
  FILE_STORAGE_DIR: string;
}

export const envValidationSchema = Joi.object<Env>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  API_PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('replace-with-a-long-random-development-secret'),
    }),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('replace-with-a-different-long-random-development-secret'),
    }),
  CORS_ORIGIN: Joi.string()
    .custom((value: string, helpers) => {
      const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (origins.length === 0) {
        return helpers.error('string.empty');
      }

      for (const origin of origins) {
        const { error } = Joi.string().uri().validate(origin);
        if (error) {
          return helpers.error('string.uri');
        }
      }

      return value;
    })
    .default('http://localhost:3000,http://127.0.0.1:3000'),
  SWAGGER_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true),
    }),
  SWAGGER_USERNAME: Joi.string().min(4).optional().allow(''),
  SWAGGER_PASSWORD: Joi.string().min(12).optional().allow(''),
  FILE_STORAGE_DIR: Joi.string().default('storage/uploads'),
}).custom((value: Env, helpers) => {
  if (
    value.NODE_ENV === 'production' &&
    value.SWAGGER_ENABLED &&
    (!value.SWAGGER_USERNAME || !value.SWAGGER_PASSWORD)
  ) {
    return helpers.error('any.custom', {
      message:
        'SWAGGER_USERNAME and SWAGGER_PASSWORD are required when SWAGGER_ENABLED=true in production',
    });
  }

  return value;
});

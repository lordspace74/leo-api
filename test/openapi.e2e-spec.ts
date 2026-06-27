// Preview mode instantiates no providers, but ConfigModule still validates env.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'openapi_check';

import { existsSync, readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import {
  buildOpenApiDocument,
  OPENAPI_PATH,
  serializeOpenApi,
} from '../src/openapi/openapi.config';

describe('OpenAPI document', () => {
  let app: INestApplication;
  let generated: string;

  beforeAll(async () => {
    // Preview mode builds the controller graph without opening a DB connection.
    app = await NestFactory.create(AppModule, { preview: true, logger: false });
    generated = serializeOpenApi(buildOpenApiDocument(app));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('is committed at the repository root', () => {
    expect(existsSync(OPENAPI_PATH)).toBe(true);
  });

  it('is in sync with the controllers (run `npm run openapi:generate` to update)', () => {
    const committed = readFileSync(OPENAPI_PATH, 'utf8');
    expect(generated).toEqual(committed);
  });
});

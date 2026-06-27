import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { AppModule } from '../app.module';
import {
  buildOpenApiDocument,
  OPENAPI_PATH,
  serializeOpenApi,
} from './openapi.config';

/**
 * Regenerates `openapi.json` from the current controllers. Runs the app in
 * preview mode so no providers are instantiated and no database connection is
 * opened — generation works on a clean checkout with no infrastructure.
 */
async function generate(): Promise<void> {
  const logger = new Logger('OpenApi');
  process.env.JWT_SECRET ??= 'openapi-generation';

  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  try {
    writeFileSync(OPENAPI_PATH, serializeOpenApi(buildOpenApiDocument(app)));
    logger.log(`Wrote ${OPENAPI_PATH}`);
  } finally {
    await app.close();
  }
}

generate().catch((err) => {
  console.error('OpenAPI generation failed:', err);
  process.exit(1);
});

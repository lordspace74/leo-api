import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';

/** Where the committed OpenAPI artifact lives (repository root). */
export const OPENAPI_PATH = join(__dirname, '..', '..', 'openapi.json');

/** Canonical on-disk serialization, shared by the generator and drift test. */
export function serializeOpenApi(document: OpenAPIObject): string {
  return JSON.stringify(document, null, 2) + '\n';
}

/**
 * Builds the OpenAPI 3 document from the application's controllers. Shared by
 * the runtime Swagger UI ({@link setupSwagger}), the generation script and the
 * drift test, so all three describe an identically configured API.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('LeoVegas User API')
    .setDescription(
      'JSON:API-compliant user management API. Responses use the ' +
        '`application/vnd.api+json` media type.',
    )
    .setVersion('0.0.1')
    .addServer('http://localhost:3000', 'Local development')
    .addTag('auth', 'Registration and login')
    .addTag('users', 'User management (admin operations and self-service)')
    .addTag('health', 'Service health and readiness')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Mounts the interactive Swagger UI and raw document at `/api-docs`. */
export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: 'api-docs/json',
  });
}

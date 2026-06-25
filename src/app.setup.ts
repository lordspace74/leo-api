import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JsonApiExceptionFilter } from './common/filters/json-api-exception.filter';
import { JsonApiHeaderInterceptor } from './common/interceptors/json-api-header.interceptor';

/**
 * Applies the global pipes, interceptors and filters that make up the app's
 * HTTP contract. Shared by the production bootstrap and the e2e tests so both
 * exercise an identically configured application.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new JsonApiHeaderInterceptor());
  app.useGlobalFilters(new JsonApiExceptionFilter());
}

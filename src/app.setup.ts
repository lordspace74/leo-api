import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JsonApiExceptionFilter } from './common/filters/json-api-exception.filter';
import { JsonApiHeaderInterceptor } from './common/interceptors/json-api-header.interceptor';

/**
 * Applies the global pipes, interceptors and filters that make up the app's
 * HTTP contract. Shared by the production bootstrap and the e2e tests so both
 * exercise an identically configured application.
 */
export function configureApp(app: INestApplication): void {
  // Express 5 defaults to the "simple" query parser, which does not parse
  // JSON:API bracket syntax (page[number]) into nested objects.
  const httpInstance = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: string) => void;
  };
  httpInstance.set?.('query parser', 'extended');

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

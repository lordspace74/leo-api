import { INestApplication, ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { JsonApiExceptionFilter } from './common/filters/json-api-exception.filter';
import { JsonApiHeaderInterceptor } from './common/interceptors/json-api-header.interceptor';
import { JSON_API_MEDIA_TYPE } from './common/json-api/media-type';

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

  // Nest's own `express.json()` claims only `application/json`, so a body sent
  // under the JSON:API media type — what `@ApiConsumes` advertises, and what
  // Swagger "Try it out" therefore sends — arrived unparsed and was rejected as
  // a malformed document. This parser claims both types.
  //
  // It must claim both rather than just the JSON:API one: Nest detects an
  // already-registered parser by function *name* (`express.json()` always
  // returns `jsonParser`), so registering any json parser here suppresses the
  // default one. Dropping `application/json` from this list silently stops the
  // API parsing ordinary JSON bodies.
  app.use(json({ type: ['application/json', JSON_API_MEDIA_TYPE] }));

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

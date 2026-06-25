import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  JsonApiDocument,
  toResource,
} from '../serializers/json-api.serializer';

@Injectable()
export class JsonApiInterceptor implements NestInterceptor {
  constructor(private readonly resourceType: string) {}

  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<JsonApiDocument | null> {
    return next.handle().pipe(
      map((value: unknown): JsonApiDocument | null => {
        if (value === null || value === undefined) return null;

        // Already a JSON:API document (e.g. a paginated collection) — pass through.
        if (typeof value === 'object' && 'data' in value) {
          return value as JsonApiDocument;
        }

        if (Array.isArray(value)) {
          return {
            data: (value as unknown[]).map((item) =>
              toResource(item as object, this.resourceType),
            ),
          };
        }

        return { data: toResource(value, this.resourceType) };
      }),
    );
  }
}

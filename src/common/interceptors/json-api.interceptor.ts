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

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<JsonApiDocument> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) return data;

        if (Array.isArray(data)) {
          return { data: data.map((item) => toResource(item, this.resourceType)) };
        }

        return { data: toResource(data, this.resourceType) };
      }),
    );
  }
}

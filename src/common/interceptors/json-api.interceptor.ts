import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
}

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}

function serialize(resource: Record<string, unknown>, type: string): JsonApiResource {
  const { id, created_at, updated_at, ...attributes } = resource;
  return {
    type,
    id: id as string,
    attributes: { ...attributes, created_at, updated_at },
  };
}

@Injectable()
export class JsonApiInterceptor implements NestInterceptor {
  constructor(private readonly resourceType: string) {}

  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<JsonApiDocument> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) return data;

        if (Array.isArray(data)) {
          return { data: data.map((item) => serialize(item, this.resourceType)) };
        }

        return { data: serialize(data as Record<string, unknown>, this.resourceType) };
      }),
    );
  }
}

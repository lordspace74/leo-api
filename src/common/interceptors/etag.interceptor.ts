import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';
import { resourceEtag, Versioned } from '../etag/etag.util';

function isVersioned(value: unknown): value is Versioned {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Versioned).id === 'string' &&
    (value as { updated_at?: unknown }).updated_at instanceof Date
  );
}

/**
 * Sets a strong `ETag` on single-resource responses, derived from the entity's
 * version. Express then answers a matching `If-None-Match` with `304 Not
 * Modified` on its own. Runs innermost (before JSON:API wrapping) so it sees the
 * raw entity; collection, delete and login responses pass through untouched.
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap((value: unknown) => {
        if (isVersioned(value)) {
          response.setHeader('ETag', resourceEtag(value));
        }
      }),
    );
  }
}

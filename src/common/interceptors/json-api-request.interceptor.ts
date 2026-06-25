import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Unwraps a JSON:API write request body — `{ data: { type, attributes } }` —
 * down to its attributes so the existing DTOs and global ValidationPipe can
 * validate them unchanged. Runs in the interceptor (pre-controller) phase,
 * which executes before pipes.
 *
 * Enforces the parts of the spec relevant to resource creation/updates:
 *   - the body MUST contain a `data` object with `attributes`
 *   - `data.type` MUST match the collection's resource type (else 409)
 */
@Injectable()
export class JsonApiRequestInterceptor implements NestInterceptor {
  constructor(private readonly resourceType: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ body: unknown }>();
    const body = request.body as
      | { data?: { type?: string; attributes?: Record<string, unknown> } }
      | undefined;

    const data = body?.data;
    if (!data || typeof data !== 'object') {
      throw new BadRequestException(
        'Request body must be a JSON:API document with a `data` member',
      );
    }

    if (!data.type) {
      throw new BadRequestException('`data.type` is required');
    }

    if (data.type !== this.resourceType) {
      throw new ConflictException(
        `Resource type must be "${this.resourceType}"`,
      );
    }

    request.body = data.attributes ?? {};
    return next.handle();
  }
}

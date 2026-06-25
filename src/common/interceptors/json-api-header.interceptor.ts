import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Sets the JSON:API media type on every successful response. Applied globally
 * so it also covers handlers that build their document manually (e.g. login).
 */
@Injectable()
export class JsonApiHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    return next
      .handle()
      .pipe(
        tap(() =>
          response.setHeader('Content-Type', 'application/vnd.api+json'),
        ),
      );
  }
}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Sets the JSON:API media type on every successful response. Applied globally
 * so it also covers handlers that build their document manually (e.g. login).
 * The `/health` route is an ops endpoint, not a JSON:API resource, so it is
 * left with its native content type.
 */
@Injectable()
export class JsonApiHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    return next.handle().pipe(
      tap(() => {
        if (request.path !== '/health') {
          response.setHeader('Content-Type', 'application/vnd.api+json');
        }
      }),
    );
  }
}

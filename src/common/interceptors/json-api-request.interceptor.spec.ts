import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
} from '@nestjs/common';
import { of } from 'rxjs';
import { JsonApiRequestInterceptor } from './json-api-request.interceptor';

describe('JsonApiRequestInterceptor', () => {
  const interceptor = new JsonApiRequestInterceptor('users');
  const next: CallHandler = { handle: () => of('ok') };

  const ctxWithBody = (body: unknown): ExecutionContext => {
    const request = { body };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      __request: request,
    } as unknown as ExecutionContext & { __request: { body: unknown } };
  };

  it('unwraps data.attributes onto the request body', () => {
    const ctx = ctxWithBody({
      data: { type: 'users', attributes: { name: 'John', email: 'j@x.com' } },
    });

    interceptor.intercept(ctx, next);

    expect((ctx as any).__request.body).toEqual({ name: 'John', email: 'j@x.com' });
  });

  it('rejects a body without a data member (400)', () => {
    const ctx = ctxWithBody({ name: 'John' });

    expect(() => interceptor.intercept(ctx, next)).toThrow(BadRequestException);
  });

  it('rejects a missing data.type (400)', () => {
    const ctx = ctxWithBody({ data: { attributes: { name: 'John' } } });

    expect(() => interceptor.intercept(ctx, next)).toThrow(BadRequestException);
  });

  it('rejects a mismatched resource type (409)', () => {
    const ctx = ctxWithBody({ data: { type: 'widgets', attributes: {} } });

    expect(() => interceptor.intercept(ctx, next)).toThrow(ConflictException);
  });

  it('defaults to empty attributes when none are provided', () => {
    const ctx = ctxWithBody({ data: { type: 'users' } });

    interceptor.intercept(ctx, next);

    expect((ctx as any).__request.body).toEqual({});
  });
});

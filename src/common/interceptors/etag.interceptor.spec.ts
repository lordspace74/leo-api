import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { EtagInterceptor } from './etag.interceptor';
import { resourceEtag } from '../etag/etag.util';

const contextWith = (response: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({ getResponse: () => response }),
  }) as ExecutionContext;

const handlerOf = (value: unknown): CallHandler => ({
  handle: () => of(value),
});

describe('EtagInterceptor', () => {
  let interceptor: EtagInterceptor;
  let setHeader: jest.Mock;
  let response: { setHeader: jest.Mock };

  beforeEach(() => {
    setHeader = jest.fn();
    response = { setHeader };
    interceptor = new EtagInterceptor();
  });

  it('sets a strong ETag for a versioned entity and passes it through', async () => {
    const entity = { id: 'u1', name: 'Alice', updated_at: new Date() };

    const out = await lastValueFrom(
      interceptor.intercept(contextWith(response), handlerOf(entity)),
    );

    expect(out).toBe(entity);
    expect(setHeader).toHaveBeenCalledWith('ETag', resourceEtag(entity));
  });

  it('skips collection documents', async () => {
    await lastValueFrom(
      interceptor.intercept(contextWith(response), handlerOf({ data: [] })),
    );
    expect(setHeader).not.toHaveBeenCalled();
  });

  it('skips empty (e.g. 204) responses', async () => {
    await lastValueFrom(
      interceptor.intercept(contextWith(response), handlerOf(undefined)),
    );
    expect(setHeader).not.toHaveBeenCalled();
  });
});

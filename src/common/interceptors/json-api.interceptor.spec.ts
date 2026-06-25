import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { JsonApiInterceptor, JsonApiDocument } from './json-api.interceptor';

const ctx = {} as ExecutionContext;
const handlerOf = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('JsonApiInterceptor', () => {
  const interceptor = new JsonApiInterceptor('users');

  const run = (value: unknown) =>
    lastValueFrom(interceptor.intercept(ctx, handlerOf(value)) as any) as Promise<JsonApiDocument>;

  it('wraps a single resource with type, id and attributes', async () => {
    const result = await run({
      id: 'user-1',
      name: 'John',
      email: 'john@example.com',
      created_at: 'now',
      updated_at: 'now',
    });

    expect(result).toEqual({
      data: {
        type: 'users',
        id: 'user-1',
        attributes: {
          name: 'John',
          email: 'john@example.com',
          created_at: 'now',
          updated_at: 'now',
        },
      },
    });
  });

  it('does not leak the id into attributes', async () => {
    const result = await run({ id: 'user-1', name: 'John' });

    expect((result.data as any).attributes).not.toHaveProperty('id');
  });

  it('wraps an array of resources', async () => {
    const result = await run([
      { id: 'user-1', name: 'John' },
      { id: 'user-2', name: 'Jane' },
    ]);

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(2);
    expect((result.data as any)[1]).toMatchObject({ type: 'users', id: 'user-2' });
  });

  it('passes null through untouched (e.g. 204 responses)', async () => {
    await expect(run(null)).resolves.toBeNull();
  });
});

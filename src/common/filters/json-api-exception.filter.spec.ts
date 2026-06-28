import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { JsonApiExceptionFilter } from './json-api-exception.filter';

describe('JsonApiExceptionFilter', () => {
  const filter = new JsonApiExceptionFilter();

  beforeAll(() => {
    // Silence the expected error log for the 500 case.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  const buildHost = (path = '/users') => {
    const json = jest.fn();
    const setHeader = jest.fn().mockReturnThis();
    const res: Record<string, jest.Mock> = { setHeader, json };
    const status = jest.fn().mockReturnValue(res);
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ path }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json, setHeader };
  };

  it('formats a single HttpException as a JSON:API error', () => {
    const { host, status, json } = buildHost();

    filter.catch(new NotFoundException('User x not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      errors: [{ status: '404', title: 'User x not found' }],
    });
  });

  it('expands an array of validation messages into multiple errors', () => {
    const { host, status, json } = buildHost();

    filter.catch(
      new BadRequestException([
        'email must be an email',
        'name should not be empty',
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      errors: [
        { status: '400', title: 'email must be an email' },
        { status: '400', title: 'name should not be empty' },
      ],
    });
  });

  it('maps a Postgres unique-violation to 409 Conflict', () => {
    const { host, status, json } = buildHost();
    const err = new QueryFailedError('query', [], new Error('dup') as any);
    (err as any).driverError = { code: '23505' };

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      errors: [{ status: '409', title: 'Resource already exists' }],
    });
  });

  it('sets the JSON:API media type on error responses', () => {
    const { host, setHeader } = buildHost();

    filter.catch(new NotFoundException('nope'), host);

    expect(setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.api+json',
    );
  });

  it('falls back to 500 for unknown errors', () => {
    const { host, status, json } = buildHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      errors: [{ status: '500', title: 'An unexpected error occurred' }],
    });
  });

  it('passes a failed /health check through with its native body', () => {
    const { host, status, json, setHeader } = buildHost('/health');
    const healthBody = {
      status: 'error',
      details: { database: { status: 'down' } },
    };

    filter.catch(new ServiceUnavailableException(healthBody), host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(healthBody);
    // not wrapped as a JSON:API error document, no JSON:API media type
    expect(setHeader).not.toHaveBeenCalled();
  });
});

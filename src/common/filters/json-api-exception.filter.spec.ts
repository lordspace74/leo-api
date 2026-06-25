import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JsonApiExceptionFilter } from './json-api-exception.filter';

describe('JsonApiExceptionFilter', () => {
  const filter = new JsonApiExceptionFilter();

  const buildHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
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
      new BadRequestException(['email must be an email', 'name should not be empty']),
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

  it('falls back to 500 for unknown errors', () => {
    const { host, status, json } = buildHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      errors: [{ status: '500', title: 'An unexpected error occurred' }],
    });
  });
});

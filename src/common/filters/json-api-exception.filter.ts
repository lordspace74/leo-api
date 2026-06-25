import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

/** Postgres unique-violation error code. */
const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(JsonApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, detail } = this.resolve(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(exception);
    }

    const errors = Array.isArray(detail)
      ? detail.map((title: string) => ({ status: String(status), title }))
      : [{ status: String(status), title: detail }];

    response
      .status(status)
      .setHeader('Content-Type', 'application/vnd.api+json')
      .json({ errors });
  }

  private resolve(exception: unknown): {
    status: number;
    detail: string | string[];
  } {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const detail =
        typeof res === 'string'
          ? res
          : (((res as Record<string, unknown>)?.message as string | string[]) ??
            exception.message);
      return { status: exception.getStatus(), detail };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception as { driverError?: { code?: string } }).driverError?.code ===
        PG_UNIQUE_VIOLATION
    ) {
      return { status: HttpStatus.CONFLICT, detail: 'Resource already exists' };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred',
    };
  }
}

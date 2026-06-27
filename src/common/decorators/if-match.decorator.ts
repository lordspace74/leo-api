import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type WithHeaders = { headers: Record<string, string | string[] | undefined> };

/**
 * Extracts the `If-Match` request header (the resource's expected ETag). Unlike
 * `@Headers('if-match')`, a custom param decorator is invisible to the Swagger
 * scanner, so the header is documented once via `@ApiIfMatchHeader()` instead of
 * being duplicated.
 */
export const IfMatch = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const value = ctx.switchToHttp().getRequest<WithHeaders>().headers[
      'if-match'
    ];
    return Array.isArray(value) ? value[0] : value;
  },
);

import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiProperty,
  ApiResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

// `SchemaObject`/`ReferenceObject` are not re-exported from the package root, so
// we recover the schema type from the public `ApiResponse` options instead of
// reaching into `@nestjs/swagger/dist/...` (blocked by the package exports map).
type ApiResponseSchemaOptions = Extract<
  ApiResponseOptions,
  { schema: unknown }
>;
type SchemaObject = ApiResponseSchemaOptions['schema'];
type ResponseHeaders = ApiResponseSchemaOptions['headers'];
type ReferenceObject = { $ref: string };

/** The JSON:API media type carried by every response (and write request) body. */
export const JSON_API_MEDIA_TYPE = 'application/vnd.api+json';

/** Documents the `ETag` validator emitted on single-resource responses. */
export const ETAG_RESPONSE_HEADERS: ResponseHeaders = {
  ETag: {
    description:
      'Strong validator for this resource version. Echo it back in `If-Match` on a later write.',
    schema: { type: 'string' },
  },
};

/**
 * Response shape of the `users` resource `attributes`. The serializer strips
 * `@Exclude`-marked fields (e.g. `password`), so they intentionally do not
 * appear here.
 */
export class UserResourceAttributes {
  @ApiProperty({ example: 'Alice' })
  name: string;

  @ApiProperty({ format: 'email', example: 'alice@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ format: 'date-time' })
  created_at: string;

  @ApiProperty({ format: 'date-time' })
  updated_at: string;
}

/** A single JSON:API error object as emitted by `JsonApiExceptionFilter`. */
export class JsonApiErrorObject {
  @ApiProperty({ example: '404', description: 'HTTP status code as a string' })
  status: string;

  @ApiProperty({ example: 'User not found' })
  title: string;
}

/** The top-level `{ errors: [...] }` document returned for any failure. */
export class JsonApiErrorDocument {
  @ApiProperty({ type: [JsonApiErrorObject] })
  errors: JsonApiErrorObject[];
}

/** Models that helper schemas reference by `$ref`; register via `@ApiExtraModels`. */
export const JSON_API_MODELS = [
  UserResourceAttributes,
  JsonApiErrorObject,
  JsonApiErrorDocument,
];

function resourceObject(type: string, attributes: Type): SchemaObject {
  return {
    type: 'object',
    required: ['type', 'id', 'attributes'],
    properties: {
      type: { type: 'string', enum: [type] },
      id: { type: 'string', format: 'uuid' },
      attributes: { $ref: getSchemaPath(attributes) },
    },
  };
}

/** Request envelope: `{ data: { type, attributes } }` for a write operation. */
export function jsonApiRequestSchema(
  type: string,
  attributes: Type,
): SchemaObject {
  return {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['type', 'attributes'],
        properties: {
          type: { type: 'string', enum: [type] },
          attributes: { $ref: getSchemaPath(attributes) },
        },
      },
    },
  };
}

/** Single-resource response document, optionally carrying a `meta` object. */
export function jsonApiResourceSchema(
  type: string,
  attributes: Type,
  meta?: SchemaObject,
): SchemaObject {
  const properties: Record<string, SchemaObject | ReferenceObject> = {
    data: resourceObject(type, attributes),
  };
  if (meta) properties.meta = meta;
  return { type: 'object', required: ['data'], properties };
}

/** Collection response document with pagination `meta` and `links`. */
export function jsonApiCollectionSchema(
  type: string,
  attributes: Type,
): SchemaObject {
  return {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'array', items: resourceObject(type, attributes) },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          size: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      links: {
        type: 'object',
        properties: {
          self: { type: 'string' },
          first: { type: 'string' },
          prev: { type: 'string', nullable: true },
          next: { type: 'string', nullable: true },
          last: { type: 'string' },
        },
      },
    },
  };
}

/** A successful response carrying a JSON:API document of the given `schema`. */
export function ApiJsonApiResponse(
  status: number,
  schema: SchemaObject | ReferenceObject,
  description?: string,
  headers?: ResponseHeaders,
) {
  return ApiResponse({
    status,
    description,
    headers,
    content: { [JSON_API_MEDIA_TYPE]: { schema } },
  });
}

/** Documents an `If-Match` precondition (required) on an unsafe request. */
export function ApiIfMatchHeader() {
  return ApiHeader({
    name: 'If-Match',
    required: true,
    description:
      'Current resource `ETag`. Omitting it fails with `428`; a stale value fails with `412`.',
  });
}

/** Documents an optional `If-None-Match` conditional read. */
export function ApiIfNoneMatchHeader() {
  return ApiHeader({
    name: 'If-None-Match',
    required: false,
    description:
      'A previously returned `ETag`. The server replies `304 Not Modified` if it still matches.',
  });
}

/** A bodiless `304 Not Modified` response for a satisfied conditional read. */
export function ApiNotModifiedResponse() {
  return ApiResponse({
    status: 304,
    description:
      'The resource is unchanged since the supplied `If-None-Match`.',
    headers: ETAG_RESPONSE_HEADERS,
  });
}

/** An error response carrying a JSON:API `{ errors: [...] }` document. */
export function ApiJsonApiError(status: number, description: string) {
  return ApiJsonApiResponse(
    status,
    { $ref: getSchemaPath(JsonApiErrorDocument) },
    description,
  );
}

/**
 * Declares a JSON:API write request body of `{ data: { type, attributes } }`,
 * carried under the `application/vnd.api+json` media type (set via
 * `@ApiConsumes`, since `@ApiBody` alone can only document `application/json`).
 */
export function ApiJsonApiBody(type: string, attributes: Type) {
  return applyDecorators(
    ApiConsumes(JSON_API_MEDIA_TYPE),
    ApiBody({ required: true, schema: jsonApiRequestSchema(type, attributes) }),
  );
}

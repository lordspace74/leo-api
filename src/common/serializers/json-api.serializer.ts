import { instanceToPlain } from 'class-transformer';

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
  meta?: Record<string, unknown>;
}

/**
 * Converts an entity (or plain record) into a single JSON:API resource object.
 * Uses class-transformer so @Exclude-decorated fields (e.g. password) are
 * stripped instead of leaking into the response.
 */
export function toResource(record: object, type: string): JsonApiResource {
  const plain = instanceToPlain(record) as Record<string, unknown>;
  const { id, created_at, updated_at, ...attributes } = plain;

  return {
    type,
    id: id as string,
    attributes: { ...attributes, created_at, updated_at },
  };
}

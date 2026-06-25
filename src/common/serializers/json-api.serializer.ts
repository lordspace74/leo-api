import { instanceToPlain } from 'class-transformer';

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[];
  meta?: Record<string, unknown>;
  links?: Record<string, string | null>;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Builds a JSON:API collection document with page-based pagination `meta` and
 * `links` (self/first/prev/next/last).
 */
export function toCollection<T extends object>(
  page: Page<T>,
  type: string,
  path: string,
): JsonApiDocument {
  const totalPages = Math.max(1, Math.ceil(page.total / page.size));
  const link = (n: number) =>
    `${path}?page[number]=${n}&page[size]=${page.size}`;

  return {
    data: page.items.map((item) => toResource(item, type)),
    meta: { total: page.total, page: page.page, size: page.size, totalPages },
    links: {
      self: link(page.page),
      first: link(1),
      prev: page.page > 1 ? link(page.page - 1) : null,
      next: page.page < totalPages ? link(page.page + 1) : null,
      last: link(totalPages),
    },
  };
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

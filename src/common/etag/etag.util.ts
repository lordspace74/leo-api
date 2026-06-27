import {
  HttpException,
  HttpStatus,
  PreconditionFailedException,
} from '@nestjs/common';

/** Anything with a stable id and a version timestamp can carry an ETag. */
export interface Versioned {
  id: string;
  updated_at: Date;
}

/**
 * Strong validator derived from the resource id and its version timestamp. Any
 * persisted change bumps `updated_at` (via TypeORM `@UpdateDateColumn`), so the
 * tag changes with it. Quoted per RFC 7232.
 */
export function resourceEtag(entity: Versioned): string {
  return `"${entity.id}-${entity.updated_at.getTime()}"`;
}

/**
 * Whether an `If-Match` / `If-None-Match` header value selects the given tag.
 * Accepts a comma-separated list and the `*` wildcard ("any current version").
 */
export function etagMatches(headerValue: string, etag: string): boolean {
  return headerValue
    .split(',')
    .map((tag) => tag.trim())
    .some((tag) => tag === '*' || tag === etag);
}

/**
 * Enforces the `If-Match` precondition for an unsafe (write) request:
 *   - header absent -> 428 Precondition Required (the API mandates it)
 *   - header stale  -> 412 Precondition Failed (the resource changed first)
 */
export function assertIfMatch(
  entity: Versioned,
  ifMatch: string | undefined,
): void {
  if (!ifMatch) {
    throw new HttpException(
      'An If-Match header carrying the current ETag is required',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  if (!etagMatches(ifMatch, resourceEtag(entity))) {
    throw new PreconditionFailedException(
      'The resource has changed since it was last fetched; re-read it and retry',
    );
  }
}

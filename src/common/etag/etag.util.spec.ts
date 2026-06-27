import { HttpStatus, PreconditionFailedException } from '@nestjs/common';
import {
  assertIfMatch,
  etagMatches,
  resourceEtag,
  Versioned,
} from './etag.util';

const entity = (overrides: Partial<Versioned> = {}): Versioned => ({
  id: 'user-1',
  updated_at: new Date('2026-01-02T03:04:05.678Z'),
  ...overrides,
});

describe('etag util', () => {
  describe('resourceEtag', () => {
    it('is a quoted, strong tag built from id and version time', () => {
      const tag = resourceEtag(entity());
      expect(tag).toBe(
        `"user-1-${new Date('2026-01-02T03:04:05.678Z').getTime()}"`,
      );
      expect(tag.startsWith('W/')).toBe(false);
    });

    it('changes when updated_at changes', () => {
      const a = resourceEtag(entity());
      const b = resourceEtag(
        entity({ updated_at: new Date('2026-01-02T03:04:05.679Z') }),
      );
      expect(a).not.toBe(b);
    });
  });

  describe('etagMatches', () => {
    const tag = resourceEtag(entity());

    it('matches an exact tag', () => {
      expect(etagMatches(tag, tag)).toBe(true);
    });

    it('matches when present in a comma-separated list', () => {
      expect(etagMatches(`"other", ${tag}`, tag)).toBe(true);
    });

    it('matches the wildcard', () => {
      expect(etagMatches('*', tag)).toBe(true);
    });

    it('does not match a different tag', () => {
      expect(etagMatches('"nope"', tag)).toBe(false);
    });
  });

  describe('assertIfMatch', () => {
    it('passes for a current tag', () => {
      const e = entity();
      expect(() => assertIfMatch(e, resourceEtag(e))).not.toThrow();
    });

    it('passes for the wildcard', () => {
      expect(() => assertIfMatch(entity(), '*')).not.toThrow();
    });

    it('throws 428 when the header is missing', () => {
      expect(() => assertIfMatch(entity(), undefined)).toThrow(
        expect.objectContaining({ status: HttpStatus.PRECONDITION_REQUIRED }),
      );
    });

    it('throws 412 when the header is stale', () => {
      expect(() => assertIfMatch(entity(), '"stale"')).toThrow(
        PreconditionFailedException,
      );
    });
  });
});

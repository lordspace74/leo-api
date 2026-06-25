import { Transform } from 'class-transformer';

/**
 * Normalizes an email to a trimmed, lower-cased form so that lookups and the
 * unique constraint treat `Alice@Example.com` and `alice@example.com` alike.
 */
export const NormalizeEmail = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

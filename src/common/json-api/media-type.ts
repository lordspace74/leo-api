/**
 * The JSON:API media type. Single source of truth for the three places that must
 * agree: the body parser that accepts it on requests, the interceptor/filter
 * that stamp it on responses, and the OpenAPI document that advertises it.
 * Drift between them is invisible at build time and surfaces as a request the
 * API documents but cannot read.
 */
export const JSON_API_MEDIA_TYPE = 'application/vnd.api+json';

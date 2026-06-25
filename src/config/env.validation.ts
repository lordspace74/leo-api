/**
 * Fails fast at startup if security-critical configuration is missing, so the
 * app can never fall back to an insecure default (e.g. a hard-coded JWT secret).
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = ['JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}

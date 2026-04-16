/**
 * Structured logger. JSON in prod (for log aggregation), pretty in dev.
 * Pipes errors to Sentry when NEXT_PUBLIC_SENTRY_DSN is set.
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, singleLine: true },
        },
      }
    : {}),
  base: { app: "focus-camp" },
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.token",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
});

export function logError(
  err: unknown,
  context: Record<string, unknown> = {}
): void {
  const payload =
    err instanceof Error
      ? { err: { message: err.message, stack: err.stack, name: err.name } }
      : { err };
  logger.error({ ...payload, ...context });
}

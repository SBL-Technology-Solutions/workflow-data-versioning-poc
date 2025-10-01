import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";

let cachedLogger: Awaited<ReturnType<typeof createLogger>>;

const createLogger = async () => {
	const { serverEnv } = await import("@/config/env");
	const { default: pino } = await import("pino");
	const isProd = process.env.NODE_ENV === "production";
	const level = serverEnv.LOG_LEVEL ?? (isProd ? "info" : "debug");
	return pino({
		level,
		transport: isProd
			? undefined
			: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "yyyy-mm-dd HH:MM:ss.l o",
						ignore: "pid,hostname",
					},
				},
	});
};

const getLogger = createServerOnlyFn(async () => {
	if (!cachedLogger) {
		cachedLogger = await createLogger();
	}
	return cachedLogger;
});

/**
 * Server function to log messages sent from the client.
 *
 * Accepts a log level, message, and optional metadata, and logs them using the server logger.
 *
 * @example
 * // Basic usage:
 * clientLoggerFn({ data: { level: "info", message: "User logged in" } });
 *
 * // Usage with meta field:
 * // The `meta` field can be any object containing additional context for the log entry.
 * clientLoggerFn({
 *   data: {
 *     level: "error",
 *     message: "Failed to fetch data",
 *     meta: { userId: 123, errorCode: "FETCH_ERR" }
 *   }
 * });
 */
//TODO: Add auth details to the log
export const clientLoggerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			level: z.enum(["error", "warn", "info", "debug", "trace"]),
			message: z.string(),
			meta: z.record(z.string(), z.any()).optional(),
		}),
	)
	.handler(async ({ data: { level, message, meta } }) => {
		const logger = await getLogger();
		return meta
			? logger[level](meta, `Client: ${message}`)
			: logger[level](`Client: ${message}`);
	});

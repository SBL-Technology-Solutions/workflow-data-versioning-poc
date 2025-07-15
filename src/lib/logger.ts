import pino from "pino";
import { env } from "@/env";

const isProd = process.env.NODE_ENV === "production";

const level = env.LOG_LEVEL ?? (isProd ? "info" : "debug");

export const logger = pino({
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

import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z.url().min(1),
	LOG_LEVEL: z
		.enum(["error", "warn", "info", "debug", "trace"])
		.default("info"),
});

const clientEnvSchema = z.object({});
export const serverEnv = envSchema.parse(process.env);
// export const clientEnv = clientEnvSchema.parse(import.meta.env);

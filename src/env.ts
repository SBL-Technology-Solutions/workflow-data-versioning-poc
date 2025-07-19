import dotenvFlow from "dotenv-flow";

dotenvFlow.config();

import { createEnv } from "@t3-oss/env-core";
import * as z from "zod/v4";

export const env = createEnv({
	server: {
		PGHOST: z.string().min(1),
		PGDATABASE: z.string().min(1),
		PGUSER: z.string().min(1),
		PGPASSWORD: z.string().min(1),
		PGSSLMODE: z.string().min(1).default("require"),
		PGCHANNELBINDING: z.string().min(1).default("require"),
		USE_PGLITE: z.string().default("false"),
		PGLITE_URL: z.string().default("./.pglite-db"),
		LOG_LEVEL: z
			.enum(["error", "warn", "info", "debug", "trace"])
			.default("info"),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: process.env,

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});

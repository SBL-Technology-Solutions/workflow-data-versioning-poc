import dotenvFlow from "dotenv-flow";

dotenvFlow.config();

import { env } from "@/env";

const {
	PGHOST,
	PGDATABASE,
	PGUSER,
	PGPASSWORD,
	PGSSLMODE,
	PGCHANNELBINDING,
	USE_PGLITE,
	PGLITE_URL,
} = env;

export const usePglite = USE_PGLITE === "true";
export const pgLiteUrl = PGLITE_URL;
export const connectionString = `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${encodeURIComponent(PGHOST)}/${encodeURIComponent(PGDATABASE)}?sslmode=${PGSSLMODE}&channel_binding=${PGCHANNELBINDING}`;

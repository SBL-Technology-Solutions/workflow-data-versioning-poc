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

console.log("USE_PGLITE in db.config.ts", USE_PGLITE);
console.log("PGLITE_URL in db.config.ts", PGLITE_URL);

export const usePglite = USE_PGLITE === "true";
export const pgLiteUrl = PGLITE_URL;
export const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=${PGSSLMODE}&channel_binding=${PGCHANNELBINDING}`;

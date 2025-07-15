import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { connectionString, pgLiteUrl, usePglite } from "@/db/config";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

const dbClientLogger = logger.child({
	component: "dbClient",
});

let _dbClient: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleLite>;

export const getDbClient = () => {
	if (_dbClient) return _dbClient;
	if (usePglite) {
		const client = new PGlite(pgLiteUrl);
		_dbClient = drizzleLite(client, { schema });
		dbClientLogger.info("Connected to the pglite database");
	} else {
		const pool = new Pool({ connectionString });
		_dbClient = drizzlePg(pool, { schema });
		dbClientLogger.info("Connected to pg database");
	}
	return _dbClient;
};
export const dbClient = usePglite
	? drizzleLite(new PGlite(pgLiteUrl), { schema })
	: drizzlePg({
			client: new Pool({
				connectionString,
			}),
			schema,
		});

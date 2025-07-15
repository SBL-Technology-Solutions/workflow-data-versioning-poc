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

export const dbClient = usePglite
	? drizzleLite(new PGlite(pgLiteUrl), { schema })
	: drizzlePg({
			client: new Pool({
				connectionString,
			}),
			schema,
		});

const validateConnection = async () => {
	try {
		const result = await dbClient.execute("SELECT version()");
		dbClientLogger.info(
			"successfully connected to db",
			usePglite ? "pglite" : "pg",
			"version",
			result.rows[0],
		);
		return {
			success: true,
			version: result.rows[0],
			message: "Database connection successful",
		};
	} catch (error) {
		dbClientLogger.error("Database connection error", error);
		throw error;
	}
};

validateConnection();

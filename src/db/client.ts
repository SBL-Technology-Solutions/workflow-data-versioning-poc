import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { connectionString, pgLiteUrl, usePglite } from "@/db/config";
import * as schema from "./schema";

console.log("usePglite", usePglite);
console.log("pgLiteUrl", pgLiteUrl);
console.log("connectionString", connectionString);

const pool = new Pool({
	connectionString,
});
export const dbClient = usePglite
	? drizzleLite(new PGlite(pgLiteUrl), { schema })
	: drizzlePg({ client: pool, schema });

const validateConnection = async () => {
	try {
		const result = await dbClient.execute("SELECT version()");
		console.log(
			"successfully connected to db",
			usePglite ? "pglite" : "pg",
			"version",
			result.rows[0],
		);
	} catch (error) {
		console.error(error);
	}
};

const runLocalSetup = async () => {
	if (usePglite) {
		await migrate(dbClient as any, {
			migrationsFolder: "./drizzle/migrations",
		});
		// await seedData();
	}
};

validateConnection();
runLocalSetup();

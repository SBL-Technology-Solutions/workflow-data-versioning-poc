import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = env;

export const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require&channel_binding=require`;

const pool = new Pool({
	connectionString,
});
export const dbClient = drizzle({ client: pool, schema });

const validateConnection = async () => {
	try {
		const result = await dbClient.execute("SELECT version()");
		console.log(
			"successfully connected to db",
			PGHOST,
			"version",
			result.rows[0],
		);
	} catch (error) {
		console.error(error);
	}
};

validateConnection();

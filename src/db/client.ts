import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import { connectionString, pgLiteUrl, usePglite } from "@/db/config";
import * as schema from "./schema";

export const dbClient = usePglite
	? drizzleLite(new PGlite(pgLiteUrl), { schema })
	: drizzlePg({
			client: new Pool({
				connectionString,
			}),
			schema,
		});

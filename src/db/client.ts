import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
});

export const dbClient = drizzle(pool, { schema, casing: "snake_case" });

export type DbTransaction = Parameters<
	Parameters<typeof dbClient.transaction>[0]
>[0];

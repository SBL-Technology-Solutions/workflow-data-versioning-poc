import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "../../../../envConfig.ts";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
});

export const db = drizzle(pool, { schema });

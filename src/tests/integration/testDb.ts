import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { reset } from "drizzle-seed";
import { Pool } from "pg";
import * as schema from "@/db/schema";

export type TestDbContext = {
	container: StartedPostgreSqlContainer;
	pool: Pool;
	db: ReturnType<typeof drizzle>;
};

const DEFAULT_IMAGE = "postgres:17.5";

export async function setupTestDb(
	image = DEFAULT_IMAGE,
): Promise<TestDbContext> {
	const container = await new PostgreSqlContainer(image).start();
	const connectionString = container.getConnectionUri();
	process.env.DATABASE_URL = connectionString;

	const pool = new Pool({ connectionString });
	const db = drizzle(pool, { schema, casing: "snake_case" });

	await migrate(db, { migrationsFolder: "./drizzle/migrations" });

	return { container, pool, db };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
	await ctx.pool.end();
	const { dbClient } = await import("@/db/client");
	await dbClient.$client.end();
	await ctx.container.stop();
}

export async function truncateAllTables(
	db: ReturnType<typeof drizzle>,
): Promise<void> {
	await reset(db, schema);
}

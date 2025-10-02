import { defineConfig } from "drizzle-kit";
import { serverEnv } from "@/config/env";

export default defineConfig({
	out: "./drizzle/migrations",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: serverEnv.DATABASE_URL,
	},
	casing: "snake_case",
});

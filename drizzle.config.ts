import { defineConfig } from "drizzle-kit";
import { connectionString } from "@/db";

export default defineConfig({
	out: "./drizzle/migrations",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: connectionString,
	},
});

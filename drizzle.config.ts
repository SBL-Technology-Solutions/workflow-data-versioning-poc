import { defineConfig } from "drizzle-kit";
import { connectionString, pgLiteUrl, usePglite } from "@/db/config";

console.log("usePglite", usePglite);
console.log("pgLiteUrl", pgLiteUrl);
console.log("connectionString", usePglite ? pgLiteUrl : connectionString);

export default defineConfig({
	out: "./drizzle/migrations",
	schema: "./src/db/schema.ts",
	dialect: "postgresql",
	...(usePglite && { driver: "pglite" }),
	dbCredentials: {
		url: usePglite ? pgLiteUrl : connectionString,
	},
});

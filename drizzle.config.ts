import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL as string;

if (!dbUrl) {
  console.error("DATABASE_URL is not set");
}

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./app/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});

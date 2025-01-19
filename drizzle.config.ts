import { defineConfig } from "drizzle-kit";
import "./envConfig.ts";

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./src/app/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});

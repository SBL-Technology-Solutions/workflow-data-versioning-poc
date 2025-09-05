// import { execSync } from "node:child_process";
// import waitOn from "wait-on";

export default async function globalSetup() {
	return;
	// 	// Ensure Postgres is running, then run migrations and seed before app starts
	// 	try {
	// 		console.log("[e2e] Bringing up Postgres via docker compose...");
	// 		execSync("pnpm db:up", { stdio: "inherit" });

	// 		console.log("[e2e] Waiting for Postgres on tcp:5432...");
	// 		await waitOn({ resources: ["tcp:localhost:5432"], timeout: 60_000 });

	// 		console.log("[e2e] Running DB migrations...");
	// 		execSync("pnpm db:migrate", { stdio: "inherit" });

	// 		console.log("[e2e] Seeding database...");
	// 		execSync("pnpm db:seed", { stdio: "inherit" });
	// 	} catch (err) {
	// 		console.error("[e2e] Global setup failed:", err);
	// 		throw err;
	// 	}
}

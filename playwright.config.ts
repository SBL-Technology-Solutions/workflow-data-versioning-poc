import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 2 : 0,
	fullyParallel: true,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
	globalSetup: "./e2e/global-setup.ts",
	use: {
		baseURL: "http://localhost:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		headless: !!process.env.CI,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		// Start only the web app here; DB is handled in globalSetup
		command: "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});


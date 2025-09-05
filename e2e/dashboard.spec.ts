import { test, expect } from "@playwright/test";
import { disableSplash } from "./utils";

test("Dashboard loads and shows sections", async ({ page }) => {
	await disableSplash(page);
	await page.goto("/");

	await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Create New Workflow" }),
	).toBeVisible();

	await expect(
		page.getByRole("heading", { name: "Recent Workflow Definitions" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Recent Workflow Instances" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Recent Form Definitions" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Recent Form Data Versions" }),
	).toBeVisible();
});


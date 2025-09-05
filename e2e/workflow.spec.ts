import { test, expect } from "@playwright/test";
import { disableSplash } from "./utils";

test("Create a workflow and progress through states", async ({ page }) => {
	await disableSplash(page);
	await page.goto("/");

	await page.getByRole("button", { name: "Create New Workflow" }).click();

	// Navigates to /workflowInstances/:id?state=form1
	await expect(
		page.getByRole("heading", { name: /Workflow Step: form1/ }),
	).toBeVisible();

	// Fill Personal Information form (form1)
	await page.locator("#firstName").fill("Ada");
	await page.locator("#lastName").fill("Lovelace");
	await page.locator("#bio").fill("Mathematician and early programmer.");

	// Save the form
	await page.getByRole("button", { name: "Save" }).click();
	await expect(
		page.getByText("Form saved successfully", { exact: false }),
	).toBeVisible();

	// Move to next state via event button NEXT
	await page.getByRole("button", { name: "NEXT" }).click();

	await expect(
		page.getByRole("heading", { name: /Workflow Step: form2/ }),
	).toBeVisible();

	// Fill Contact Information form (form2)
	await page.locator("#email").fill("ada@example.com");
	await page.locator("#phone").fill("+15555555555");
	await page.locator("#address").fill("123 Computing Ln, London");

	// Save final form
	await page.getByRole("button", { name: "Save" }).click();
	await expect(
		page.getByText("Form saved successfully", { exact: false }),
	).toBeVisible();

	// Return home and see the new instance listed
	await page.getByRole("link", { name: "Home" }).click();
	await expect(
		page.getByRole("heading", { name: "Recent Workflow Instances" }),
	).toBeVisible();
});


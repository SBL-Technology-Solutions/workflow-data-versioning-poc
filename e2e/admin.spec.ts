import { test, expect } from "@playwright/test";
import { disableSplash } from "./utils";

test("Admin form builder loads and can save a new version", async ({ page }) => {
	await disableSplash(page);
	// Navigate directly to admin builder for workflow 1 state form2
	await page.goto("/admin/workflow/1/forms?state=form2");

	await expect(
		page.getByRole("heading", { name: /Edit Form:/ }),
	).toBeVisible();

	// Save without changes to create a new version
	await page.getByRole("button", { name: "Save Form" }).click();
	await expect(
		page.getByText("Form definition saved successfully", { exact: false }),
	).toBeVisible();
});

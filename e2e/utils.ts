import type { Page } from "@playwright/test";

export async function disableSplash(page: Page) {
	// Prevent the splash screen from appearing on first load
	await page.addInitScript(() => {
		try {
			window.sessionStorage.setItem("showSplash", "false");
		} catch {}
	});
}


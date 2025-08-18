import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tailwindcss(),
		tsconfigPaths(),
		tanstackStart({
			target: "netlify",
		}),
	],
	build: {
		assetsInlineLimit: 0,
	},
});

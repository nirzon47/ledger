import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tanstackRouter({ target: "react" }),
		react(),
		tailwindcss(),
		cloudflare(),
	],
	// one bundle on purpose so tab switches never wait on a chunk download
	build: { chunkSizeWarningLimit: 700 },
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname, "./src") },
	},
});

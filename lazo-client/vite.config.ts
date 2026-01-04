import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), "");

	return {
		server: {
			proxy: {
				"/api": {
					target: env.API_PROXY_TARGET || "http://localhost:3000",
					changeOrigin: true,
					secure: false,
				},
			},
		},
		plugins: [
			react(),
			electron({
				main: {
					// Shortcut of `build.lib.entry`.
					entry: "electron/main.ts",
					vite: {
						build: {
							rollupOptions: {
								external: ["better-sqlite3"],
							},
						},
					},
				},
				preload: {
					// Shortcut of `build.rollupOptions.input`.
					// Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
					input: path.join(__dirname, "electron/preload.ts"),
					vite: {
						build: {
							rollupOptions: {
								output: {
									format: "cjs",
									entryFileNames: "[name].cjs",
								},
							},
						},
					},
				},
				// Ployfill the Electron and Node.js API for Renderer process.
				// If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
				// See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
				renderer:
					process.env.NODE_ENV === "test"
						? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
						  undefined
						: {},
			}),
		],
	};
});

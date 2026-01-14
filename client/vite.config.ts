import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), "");

	return {
		server: {
			proxy: {
				"/api": {
					target:
						env.API_PROXY_TARGET || "https://d2xdgw8apwt2qd.cloudfront.net",
					changeOrigin: true,
					secure: false,
				},
			},
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: [
							"react",
							"react-dom",
							"@mui/material",
							"@mui/icons-material",
							"@supabase/supabase-js",
						],
					},
				},
			},
		},
		plugins: [react()],
	};
});

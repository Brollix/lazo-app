import chokidar from "chokidar";
import path from "path";
import { app } from "electron";

export function initWatcher() {
	const documentsPath = app.getPath("documents");
	const zoomPath = path.join(documentsPath, "Zoom");

	console.log(`Initializing watcher on: ${zoomPath}`);

	const watcher = chokidar.watch(zoomPath, {
		ignored: /(^|[\/\\])\../, // ignore dotfiles
		persistent: true,
		depth: 2, // Zoom folders usually have depth
	});

	watcher
		.on("add", (path) => {
			if (path.endsWith(".mp4") || path.endsWith(".m4a")) {
				console.log(`Video/Audio detected: ${path}`);
				// Here we would extract audio and trigger processing
			}
		})
		.on("ready", () => console.log("Initial scan complete. Ready for changes"))
		.on("error", (error) => console.error(`Watcher error: ${error}`));

	return watcher;
}

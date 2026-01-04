import chokidar, { FSWatcher } from "chokidar";
import fs from "fs";

let watcher: FSWatcher | null = null;
let onFileDetectedCallback: ((filePath: string) => void) | null = null;

export function setOnFileDetected(callback: (filePath: string) => void) {
	onFileDetectedCallback = callback;
}

export function startWatcher(watchPath: string) {
	if (watcher) {
		console.log("Stopping previous watcher...");
		watcher.close();
		watcher = null;
	}

	// Ensure directory exists, if not, maybe we shouldn't crash but warn
	if (!fs.existsSync(watchPath)) {
		console.warn(`Watch path does not exist: ${watchPath}`);
		return null;
	}

	console.log(`Initializing watcher on: ${watchPath}`);

	watcher = chokidar.watch(watchPath, {
		ignored: /(^|[\/\\])\../, // ignore dotfiles
		persistent: true,
		depth: 2, // Zoom folders usually have depth
		ignoreInitial: true, // Don't trigger on existing files immediately on start, or maybe yes? User asked to process "nuevos archivos" (new files). Usually ignoring initial is safer to avoid reprocessing old stuff on every restart.
	});

	watcher
		.on("add", (filePath) => {
			if (filePath.endsWith(".mp4") || filePath.endsWith(".m4a")) {
				console.log(`Video/Audio detected: ${filePath}`);
				if (onFileDetectedCallback) {
					onFileDetectedCallback(filePath);
				}
			}
		})
		.on("ready", () => console.log("Initial scan complete. Ready for changes"))
		.on("error", (error) => console.error(`Watcher error: ${error}`));

	return watcher;
}

export function stopWatcher() {
	if (watcher) {
		watcher.close();
		watcher = null;
	}
}
